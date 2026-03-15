---
generated_by: codex
---
# Kubernetes Datapath Comparison on EKS: Reproducible POC Blueprint

## 0) Scope

This blueprint defines a controlled experiment to compare Kubernetes Service datapaths on Amazon EKS:

1. `kube-proxy` in `iptables` mode  
2. `kube-proxy` in `ipvs` mode  
3. `kube-proxy` in `nftables` mode (only if platform supports it)  
4. Cilium with kube-proxy replacement (`eBPF` Service datapath)

This is a controlled lab design, not a production benchmark.

---

## 1) Experiment Objectives

## Primary objectives
1. Quantify datapath control-plane cost as Service/Endpoint count increases.
2. Quantify datapath data-plane behavior under steady and burst traffic.
3. Measure Service creation-to-availability latency at each scale step.
4. Identify mode-specific scaling bottlenecks: rule programming time, conntrack pressure, softirq pressure, CPU cost, tail latency.

## Decision questions
1. At what Service count does each mode show nonlinear degradation?
2. Which mode keeps P99 latency and error rate stable under burst?
3. Which mode minimizes dataplane programming lag during Service churn?

---

## 2) Control Variables and Cluster Design

## Fixed variables across all variants
1. Region/AZs: same region, same AZ spread.
2. Kubernetes version: same minor/patch for all clusters.
3. Node AMI family: same (prefer AL2023 on EKS as of 2026).
4. Node instance type: same (example `m6i.2xlarge`).
5. Node count: same per cluster and same autoscaling policy (or disabled).
6. CNI for kube-proxy modes: same (AWS VPC CNI).
7. Pod resource requests/limits: identical for all workloads.
8. Traffic generator placement: dedicated node group, same size.
9. Test windows: same duration and warm-up.
10. Observability stack: same chart versions and scrape intervals.
11. Background load: disabled or held constant.

## Cluster topology
1. Create **4 separate clusters** to avoid cross-mode contamination.
2. Cluster names:
   - `dp-iptables`
   - `dp-ipvs`
   - `dp-nft` (conditional)
   - `dp-cilium-ebpf`
3. Node groups per cluster:
   - `workers`: hosts tested services/backends.
   - `loadgen`: hosts traffic generator only.
   - `obs`: optional, for Prometheus/Grafana isolation.

## Recommended baseline size
1. 6 worker nodes + 2 loadgen nodes + 2 obs nodes.
2. Disable cluster autoscaler during test runs.

---

## 3) Preflight and Reproducibility Guardrails

## Tooling versions to pin
1. `aws` CLI version
2. `eksctl` version
3. `kubectl` version
4. `helm` version
5. `jq` version
6. Fortio/Vegeta image tags
7. kube-prometheus-stack chart version
8. Cilium Helm chart version

## Record environment fingerprint before each run
```bash
date -Iseconds
aws --version
eksctl version
kubectl version --client -o yaml
helm version
uname -a
```

## Node/kernel checks (all clusters)
```bash
kubectl get nodes -o wide
kubectl get nodes -o json | jq -r '.items[] | [.metadata.name,.status.nodeInfo.kernelVersion,.status.nodeInfo.osImage,.status.nodeInfo.containerRuntimeVersion] | @tsv'
```

## `nftables` applicability gate
Run on a sample node in candidate `dp-nft` cluster:
```bash
uname -r
nft --version
```
Require:
1. Kernel `>= 5.13`
2. `nft` CLI `>= 1.0.1`
3. kube-proxy addon schema accepts `mode: nftables`

Schema check:
```bash
ADDON_VER=$(aws eks describe-addon-versions --addon-name kube-proxy --query 'addons[0].addonVersions[0].addonVersion' --output text)
aws eks describe-addon-configuration --addon-name kube-proxy --addon-version "$ADDON_VER" \
  --query configurationSchema --output text | jq .
```

If unsupported, mark `dp-nft` as **Not Applicable** and continue with 3-way comparison.

---

## 4) Step-by-Step Setup

## 4.1 Common EKS cluster creation template
```bash
export REGION=us-west-2
export K8S_VERSION=1.33
export NODE_TYPE=m6i.2xlarge

eksctl create cluster \
  --name dp-iptables \
  --region $REGION \
  --version $K8S_VERSION \
  --nodegroup-name workers \
  --node-type $NODE_TYPE \
  --nodes 6 \
  --managed
```

Repeat for each cluster name. Keep all parameters identical.

## 4.2 kube-proxy `iptables` mode
Set explicitly (avoid implicit defaults):
```bash
aws eks update-addon \
  --cluster-name dp-iptables \
  --addon-name kube-proxy \
  --configuration-values '{"mode":"iptables"}' \
  --resolve-conflicts OVERWRITE
kubectl --context <dp-iptables> -n kube-system rollout status ds/kube-proxy
```

## 4.3 kube-proxy `ipvs` mode
Load required modules on workers (bootstrap/user-data preferred).  
Then:
```bash
aws eks update-addon \
  --cluster-name dp-ipvs \
  --addon-name kube-proxy \
  --configuration-values '{"mode":"ipvs","ipvs":{"scheduler":"rr"}}' \
  --resolve-conflicts OVERWRITE
kubectl --context <dp-ipvs> -n kube-system rollout status ds/kube-proxy
```

Validate:
```bash
kubectl --context <dp-ipvs> -n kube-system logs ds/kube-proxy | grep -i "Using ipvs Proxier"
```

## 4.4 kube-proxy `nftables` mode (conditional)
```bash
aws eks update-addon \
  --cluster-name dp-nft \
  --addon-name kube-proxy \
  --configuration-values '{"mode":"nftables"}' \
  --resolve-conflicts OVERWRITE
kubectl --context <dp-nft> -n kube-system rollout status ds/kube-proxy
```

Validate:
```bash
kubectl --context <dp-nft> -n kube-system logs ds/kube-proxy | grep -i nft
```

## 4.5 Cilium kube-proxy replacement (`eBPF`)
Create cluster `dp-cilium-ebpf`, remove kube-proxy addon, install Cilium with replacement:
```bash
aws eks delete-addon --cluster-name dp-cilium-ebpf --addon-name kube-proxy

helm repo add cilium https://helm.cilium.io
helm repo update

helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --kube-context <dp-cilium-ebpf> \
  --set kubeProxyReplacement=true \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.enabled=true \
  --set hubble.metrics.enableOpenMetrics=true
```

Validate:
```bash
kubectl --context <dp-cilium-ebpf> -n kube-system rollout status ds/cilium
kubectl --context <dp-cilium-ebpf> -n kube-system exec ds/cilium -- cilium status --verbose
```

---

## 5) Observability Setup

## 5.1 Install Prometheus/Grafana stack
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install obs prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --kube-context <cluster-context> \
  --set prometheus.prometheusSpec.scrapeInterval="15s"
```

Deploy this identically in every cluster.

## 5.2 Scrape targets required
1. `node-exporter` (CPU, softirq, conntrack, network, memory).
2. `kube-proxy` metrics endpoint (`:10249/metrics`) for kube-proxy clusters.
3. `cilium-agent`, `cilium-operator`, Hubble metrics for Cilium cluster.
4. `kube-state-metrics` for object-level correlation.
5. API server metrics (optional but useful for control-plane correlation).

## 5.3 Core metrics to collect (exact names)

## System/node (node-exporter)
1. `node_cpu_seconds_total`
2. `node_softirqs_total`
3. `node_nf_conntrack_entries`
4. `node_nf_conntrack_entries_limit`
5. `node_network_receive_packets_total`
6. `node_network_transmit_packets_total`
7. `node_network_receive_drop_total`
8. `node_network_transmit_drop_total`
9. `node_load1`, `node_load5`
10. `node_memory_MemAvailable_bytes`

## kube-proxy clusters
1. `kubeproxy_sync_proxy_rules_duration_seconds`
2. `kubeproxy_sync_proxy_rules_last_timestamp_seconds`
3. `kubeproxy_network_programming_duration_seconds`
4. `rest_client_requests_total` (from kube-proxy process)
5. `process_cpu_seconds_total` (kube-proxy pod)

## Cilium/eBPF cluster
1. `cilium_bpf_map_pressure`
2. `cilium_bpf_map_ops_total`
3. `cilium_bpf_maps_virtual_memory_max_bytes`
4. `cilium_services_events_total`
5. `cilium_service_implementation_delay`
6. `process_cpu_seconds_total` (cilium-agent)

## Workload SLI metrics
1. Request rate (RPS)
2. Error rate (% non-2xx/timeout)
3. Latency: P50/P90/P99/P99.9
4. Service creation latency (API commit time)
5. Service availability latency (first successful dataplane response)

## Derived metrics
1. Conntrack pressure ratio = `node_nf_conntrack_entries / node_nf_conntrack_entries_limit`
2. SoftIRQ net RX rate = `sum(rate(node_softirqs_total{irq="NET_RX"}[1m])) by (instance)`
3. kube-proxy sync P99 = histogram quantile over `kubeproxy_sync_proxy_rules_duration_seconds_bucket`
4. Cilium service implementation P99 = histogram quantile over `cilium_service_implementation_delay_bucket`

---

## 6) Controlled Scaling Strategy

## 6.1 Test stages
1. Baseline: 100 Services, 2 endpoints per Service.
2. Step 1: +500 Services.
3. Step 2: +500 Services.
4. Continue to ceiling (example: 3,000 Services total).
5. Hold each step for fixed soak period (example: 10 minutes).
6. Run minimum 3 repetitions per mode per step.

## 6.2 Service generation profile
1. Use deterministic naming: `svc-000001` etc.
2. Fixed selector pattern and fixed backend pod template.
3. Keep endpoint count constant unless endpoint-scale subtest is planned.

## 6.3 Measure service creation latency
Capture:
1. `T_create_start`: timestamp before `kubectl apply`.
2. `T_create_ack`: timestamp after API success.
3. `T_first_success`: first successful request from remote probe pod to new Service ClusterIP.
4. `create_latency_ms = T_create_ack - T_create_start`
5. `availability_latency_ms = T_first_success - T_create_ack`

Example shell snippet:
```bash
t0=$(date +%s%3N)
kubectl apply -f svc.yaml >/dev/null
t1=$(date +%s%3N)

# probe loop from a dedicated pod
while true; do
  kubectl exec -n loadgen deploy/probe -- curl -sS --max-time 1 http://$CLUSTER_IP:8080/healthz >/dev/null 2>&1 && break
done
t2=$(date +%s%3N)

echo "$SERVICE_NAME,$t0,$t1,$t2,$((t1-t0)),$((t2-t1))"
```

## 6.4 Datapath state snapshot at each step
Run on representative nodes:
```bash
# iptables cluster
iptables-save | wc -l

# ipvs cluster
ipvsadm -Ln | wc -l

# nftables cluster
nft list ruleset | wc -l

# cilium cluster
kubectl -n kube-system exec ds/cilium -- cilium bpf lb list | wc -l
```

Store these snapshots with timestamps.

---

## 7) Traffic Generation Strategy

## 7.1 Steady load phase
1. Constant RPS (example: 500 RPS).
2. Duration: 10 minutes per step.
3. Uniform request distribution across selected Services.
4. Protocol: HTTP/1.1 first, optional TCP-only phase for raw datapath behavior.

## 7.2 Burst load phase
1. Baseline 200 RPS, spike to 5,000 RPS for 30s every 5 minutes.
2. Duration: 15 minutes.
3. Keep request payload size fixed.
4. Keep connection reuse policy fixed (`keepalive` on or off, but constant across runs).

## 7.3 Recommended tools
1. Fortio in-cluster for easy histogram output.
2. Optional external Vegeta for cross-validation.

Example:
```bash
fortio load -qps 500 -t 10m -c 64 http://svc-000100.test.svc.cluster.local:8080/
fortio load -qps 5000 -t 30s -c 256 http://svc-000100.test.svc.cluster.local:8080/
```

---

## 8) Data Recording Template

## 8.1 Run metadata table
| run_id | date_utc | cluster | mode | k8s_version | ami | kernel | instance_type | nodes_workers | nodes_loadgen | chart_versions | notes |
|---|---|---|---|---|---|---|---|---:|---:|---|---|

## 8.2 Per-step results table
| run_id | step | total_services | endpoints_per_service | steady_rps | burst_rps | p50_ms | p99_ms | p999_ms | error_pct | create_latency_p50_ms | create_latency_p99_ms | avail_latency_p50_ms | avail_latency_p99_ms | kubeproxy_sync_p99_ms | cilium_impl_p99_ms | conntrack_pressure_max | softirq_netrx_max | rules_count | bpf_map_pressure_max | cpu_node_avg_pct | cpu_datapath_pod_avg_pct |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## 8.3 Raw artifacts to retain
1. Prometheus TSDB snapshot or exported query CSV.
2. Fortio JSON output per phase.
3. Service create/availability latency CSV.
4. Datapath state snapshots (`iptables-save`, `ipvsadm`, `nft`, `cilium bpf` counts).
5. kube-proxy / cilium logs around each test window.
6. Full cluster config dump (`kubectl cluster-info dump`) per mode.

---

## 9) Risk and Limitations

1. Cilium mode changes both Service proxying and often CNI behavior; interpret as datapath-stack comparison, not only kube-proxy replacement.
2. Cross-cluster variance exists even with identical templates; mitigate with repeated runs and randomized run order.
3. EKS managed addon behavior can differ by Kubernetes/addon version; pin and record exact addon versions.
4. nftables mode may be unavailable or partially supported depending on EKS version/kernel/userspace.
5. Noisy neighbors in shared AWS substrate can skew latency tails; repeat and aggregate.
6. Connection reuse and client concurrency choices materially affect results; keep fixed and documented.
7. Node-local DNS/cache effects can bias outcomes; warm up consistently before measurement windows.

---

## 10) Clear Behavioral Separation for Interpretation

## kube-proxy `iptables`
1. Rule matching scales with rule set growth.
2. Rule update path can become expensive with large Service/Endpoint sets.
3. Expect stronger sensitivity to Service churn and sync duration spikes.

## kube-proxy `ipvs`
1. Uses kernel IPVS virtual server tables.
2. Usually lower lookup overhead than large iptables chains.
3. Still depends on sync behavior from kube-proxy control loop.

## kube-proxy `nftables`
1. Newer kube-proxy backend using nftables sets/maps.
2. Designed to improve scaling over legacy iptables backend.
3. Requires modern kernel/userspace and environment compatibility checks.

## Cilium kube-proxy replacement (`eBPF`)
1. Service load-balancing in eBPF maps/programs, bypassing kube-proxy.
2. Different control/data path instrumentation and resource profile.
3. Evaluate with BPF map pressure/capacity and service implementation delay metrics.

---

## 11) Execution Order (recommended)

1. Validate tooling and version pinning.
2. Create all clusters from one template.
3. Install observability stack everywhere.
4. Validate scrape targets and dashboards.
5. Run baseline sanity test (100 Services).
6. Run full stepped scaling in randomized mode order.
7. Repeat full campaign at least 3 times.
8. Aggregate and compare P99-focused results first.

---

## 12) Source Links (for version-sensitive details)

1. Kubernetes nftables mode blog: https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/  
2. Kubernetes kube-proxy config API (`iptables`/`ipvs`/`nftables` modes): https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/  
3. Kubernetes kernel requirements (`nftables` mode requirements): https://kubernetes.io/docs/reference/node/kernel-version-requirements  
4. EKS Kubernetes version support: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html  
5. EKS kube-proxy management: https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html  
6. EKS IPVS best practices: https://docs.aws.amazon.com/eks/latest/best-practices/ipvs.html  
7. EKS addon configuration schema discovery: https://docs.aws.amazon.com/eks/latest/userguide/add-ons-configuration.html  
8. Cilium kube-proxy replacement: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/  
9. Cilium metrics reference: https://docs.cilium.io/en/stable/observability/metrics/  

If you want, I can generate this as a repo-ready layout next (`README.md` + `scripts/` for service generation, latency capture, PromQL export, and run manifests).
