---
generated_by: claude
---
# Kubernetes Networking Datapath Comparison — Reproducible POC Blueprint

> **Audience:** Senior platform engineer familiar with Linux networking, eBPF, and Kubernetes internals.  
> **Scope:** Controlled lab experiment on EKS. Not a production benchmark.  
> **Last revised:** 2025-08

---

## Table of Contents

1. [Experiment Objectives](#1-experiment-objectives)
2. [Control Variables and Cluster Design](#2-control-variables-and-cluster-design)
3. [Per-Mode Setup](#3-per-mode-setup)
4. [Observability Stack](#4-observability-stack)
5. [Scaling Strategy](#5-scaling-strategy)
6. [Traffic Generation](#6-traffic-generation)
7. [Metrics Catalogue](#7-metrics-catalogue)
8. [Data Recording Template](#8-data-recording-template)
9. [Risks and Limitations](#9-risks-and-limitations)
10. [Behavioral Reference: netfilter vs. eBPF](#10-behavioral-reference-netfilter-vs-ebpf)

---

## 1. Experiment Objectives

### Primary Questions

| #   | Question                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------- |
| Q1  | How does per-node CPU utilization (user + softirq) scale as the number of ClusterIP Services increases from 100 to 10000? |
| Q2  | What is the P99 connection-establishment latency under steady-state load at each service count tier?                      |
| Q3  | How does kube-proxy sync duration (iptables vs. IPVS) grow with rule/entry count?                                         |
| Q4  | What is the conntrack table pressure (fill %, drop rate) under burst traffic for each datapath?                           |
| Q5  | How does BPF map size and lookup overhead compare to iptables rule-chain traversal at equivalent service counts?          |
| Q6  | What is the service creation latency (time from `kubectl apply` to dataplane readiness) at each tier?                     |

### Non-Goals

- Multi-cluster federation, service mesh (Istio/Linkerd), or NetworkPolicy enforcement overhead are out of scope.
- This is not a throughput (Gbps) benchmark; the focus is control-plane scaling and connection-path efficiency.

---

## 2. Control Variables and Cluster Design

### Fixed Variables (identical across all clusters)

| Variable                     | Value                                       | Notes                                       |
| ---------------------------- | ------------------------------------------- | ------------------------------------------- |
| EKS Kubernetes version       | 1.30.x                                      | Pin to same minor.patch across all clusters |
| Node AMI                     | `amazon-linux-2023/x86_64/standard`         | Verify kernel with `uname -r` post-launch   |
| Kernel version               | 6.1.x (AL2023 default)                      | Must be identical; record exact output      |
| Instance type                | `m5.2xlarge` (8 vCPU, 32 GiB)               | Consistent NUMA topology; no burstable      |
| Node count                   | 5 worker nodes                              | Fixed; no autoscaling during experiments    |
| CNI (base)                   | Amazon VPC CNI v1.18.x                      | Same version; ENI prefix mode enabled       |
| Pod CIDR                     | `10.0.0.0/16`                               |                                             |
| Service CIDR                 | `172.20.0.0/16`                             |                                             |
| EKS control plane version    | Managed; same API server revision           | Record via `kubectl version`                |
| Prometheus/exporter versions | Fixed (see §4)                              |                                             |
| Test client/server image     | `nicolaka/netshoot:latest` pinned by digest |                                             |

### Cluster Topology

One EKS cluster per datapath mode. Use separate AWS accounts or separate VPCs with distinct CIDR ranges to eliminate cross-experiment interference.

```
Cluster A: kube-proxy iptables mode   (tag: exp-iptables)
Cluster B: kube-proxy IPVS mode       (tag: exp-ipvs)
Cluster C: nftables backend            (tag: exp-nftables)   [see §3.3]
Cluster D: Cilium + kube-proxy-free    (tag: exp-cilium-ebpf)
```

### Variable Isolation Checklist

Before each experiment run:

```bash
# Confirm kernel version
uname -r

# Confirm no unexpected processes consuming CPU
top -b -n1 | head -20

# Confirm conntrack table limits
sysctl net.netfilter.nf_conntrack_max
sysctl net.netfilter.nf_conntrack_count

# Confirm no stale iptables/ipvs state from prior run
iptables -t nat -L | wc -l
ipvsadm -ln | wc -l

# Confirm BPF maps (Cilium clusters only)
bpftool map list | wc -l
```

---

## 3. Per-Mode Setup

### 3.1 kube-proxy — iptables mode

This is the EKS default. Verify and harden the configuration.

```bash
# Verify current mode
kubectl -n kube-system get configmap kube-proxy-config -o jsonpath='{.data.config}' | grep mode
# Expected: mode: iptables
```

Patch ConfigMap to explicitly set mode and tune sync parameters:

```yaml
# kube-proxy-config-iptables-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy-config
  namespace: kube-system
data:
  config: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "iptables"
    iptables:
      syncPeriod: 30s
      minSyncPeriod: 1s
      masqueradeAll: false
      masqueradeBit: 14
    metricsBindAddress: "0.0.0.0:10249"
    bindAddress: "0.0.0.0"
    clusterCIDR: "10.0.0.0/16"
```

```bash
kubectl apply -f kube-proxy-config-iptables-patch.yaml
kubectl -n kube-system rollout restart daemonset kube-proxy
kubectl -n kube-system rollout status daemonset kube-proxy
```

Verify rule generation after initial service creation:

```bash
# On a worker node
iptables -t nat -L KUBE-SERVICES --line-numbers | wc -l
iptables-save | grep -c "^-A KUBE-"
```

Set conntrack limits (apply via DaemonSet or SSM):

```bash
sysctl -w net.netfilter.nf_conntrack_max=524288
sysctl -w net.netfilter.nf_conntrack_buckets=131072
sysctl -w net.ipv4.tcp_fin_timeout=15
```

---

### 3.2 kube-proxy — IPVS mode

IPVS requires kernel modules loaded on each node. On AL2023, use a launch template or SSM document:

```bash
# Confirm modules available
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
modprobe ip_vs_sh
modprobe nf_conntrack

# Persist across reboots
cat >> /etc/modules-load.d/ipvs.conf <<'EOF'
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF
```

Patch kube-proxy ConfigMap:

```yaml
# kube-proxy-config-ipvs-patch.yaml
data:
  config: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    ipvs:
      scheduler: "rr"
      syncPeriod: 30s
      minSyncPeriod: 1s
      strictARP: true
    metricsBindAddress: "0.0.0.0:10249"
    clusterCIDR: "10.0.0.0/16"
```

```bash
kubectl apply -f kube-proxy-config-ipvs-patch.yaml
kubectl -n kube-system rollout restart daemonset kube-proxy
```

Verify IPVS state:

```bash
# On worker node (requires ipvsadm)
yum install -y ipvsadm
ipvsadm -ln | head -40
ipvsadm -ln | wc -l
```

Note: kube-proxy in IPVS mode still writes a small set of iptables rules for masquerading and NodePort hairpin. Measure these separately:

```bash
iptables -t nat -L | wc -l   # Should be much smaller than iptables mode
```

---

### 3.3 nftables backend

**Current status (as of Kubernetes 1.30):** kube-proxy does not have a stable nftables mode in upstream. The `nftables` mode was added as alpha in Kubernetes 1.29 (`NFTablesProxyMode` feature gate) and graduated to beta in 1.31. On EKS 1.30, this requires manual feature gate enablement via a custom kube-proxy binary or admission of the alpha gate.

**Practical approach for this experiment:**

Option A — Use upstream kube-proxy 1.31 binary deployed as a custom DaemonSet (replace EKS-managed kube-proxy):

```bash
# Disable managed kube-proxy
eksctl utils update-kube-proxy --cluster=exp-nftables --approve
# Then deploy custom kube-proxy DaemonSet with 1.31 image and nftables gate
```

Option B — Use a separate EC2-based kubeadm cluster on identical instance type for the nftables arm, and note this as a control deviation in your data.

```yaml
# kube-proxy-config-nftables.yaml (Kubernetes 1.31+)
data:
  config: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "nftables"
    nftables:
      syncPeriod: 30s
      minSyncPeriod: 1s
      masqueradeAll: false
    featureGates:
      NFTablesProxyMode: true
    metricsBindAddress: "0.0.0.0:10249"
```

Verify nftables rule generation:

```bash
nft list ruleset | grep -c "kube"
nft list table ip kube-proxy | wc -l
# Compare to iptables rule count at same service count
```

**Record this deviation in your experiment log. Do not conflate results from this cluster with the EKS-native clusters without annotation.**

---

### 3.4 Cilium with kube-proxy Replacement (eBPF datapath)

**Prerequisites:** Disable kube-proxy before deploying Cilium.

```bash
# Remove kube-proxy DaemonSet (EKS deploys it as a managed addon — disable via eksctl or AWS console)
kubectl -n kube-system delete daemonset kube-proxy
# Or scale to zero
kubectl -n kube-system patch daemonset kube-proxy -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-existing":"true"}}}}}'
```

Install Cilium via Helm with kube-proxy replacement and eBPF host routing:

```bash
helm repo add cilium https://helm.cilium.io/
helm repo update

helm install cilium cilium/cilium \
  --version 1.15.x \                        # Pin version
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<EKS_API_ENDPOINT> \
  --set k8sServicePort=443 \
  --set bpf.masquerade=true \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set endpointRoutes.enabled=true \
  --set loadBalancer.algorithm=maglev \
  --set loadBalancer.mode=dsr \             # Remove if DSR not desired; set to snat otherwise
  --set hubble.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,http}" \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set operator.replicas=1 \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true
```

Verify kube-proxy replacement is active:

```bash
kubectl -n kube-system exec -it ds/cilium -- cilium status | grep "KubeProxy"
# Expected: KubeProxy:    Disabled
kubectl -n kube-system exec -it ds/cilium -- cilium status | grep "BPF"
```

Inspect BPF maps:

```bash
# On a worker node
kubectl -n kube-system exec -it ds/cilium -- bpftool map list
kubectl -n kube-system exec -it ds/cilium -- cilium bpf lb list | head -40
kubectl -n kube-system exec -it ds/cilium -- cilium bpf lb list | wc -l
```

Maglev vs. random scheduling note: Maglev consistent hashing changes lookup behavior versus round-robin. Record `loadBalancer.algorithm` in experiment metadata.

---

## 4. Observability Stack

### 4.1 Deployment

Use `kube-prometheus-stack` Helm chart, pinned version:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --version 58.x.x \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.scrapeInterval=15s \
  --set prometheus.prometheusSpec.evaluationInterval=15s \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.enabled=true \
  --set alertmanager.enabled=false \
  --set nodeExporter.enabled=true \
  --set kubeProxy.enabled=true
```

### 4.2 kube-proxy Metrics

kube-proxy exposes a `/metrics` endpoint on port 10249 when `metricsBindAddress` is set (see §3).

Key metrics prefix: `kubeproxy_`

Create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-proxy
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames: [kube-system]
  selector:
    matchLabels:
      k8s-app: kube-proxy
  endpoints:
    - port: metrics
      scheme: http
      path: /metrics
      interval: 15s
```

Key kube-proxy metrics to collect:

```
kubeproxy_sync_proxy_rules_duration_seconds{quantile="0.99"}
kubeproxy_sync_proxy_rules_duration_seconds_count
kubeproxy_sync_proxy_rules_last_timestamp_seconds
kubeproxy_sync_proxy_rules_iptables_total{table="nat"}
kubeproxy_network_programming_duration_seconds{quantile="0.99"}
kubeproxy_ipvs_sync_proxy_rules_duration_seconds{quantile="0.99"}
```

### 4.3 Conntrack Metrics

node_exporter exposes conntrack via `node_nf_conntrack_*`. Verify:

```bash
curl -s http://NODE_IP:9100/metrics | grep conntrack
```

Expected metrics:

```
node_nf_conntrack_entries
node_nf_conntrack_entries_limit
node_nf_conntrack_stat_drop
node_nf_conntrack_stat_insert_failed
node_nf_conntrack_stat_early_drop
```

Derived alert expression for fill ratio:

```promql
node_nf_conntrack_entries / node_nf_conntrack_entries_limit
```

### 4.4 Cilium Metrics

Cilium exposes metrics on port 9962 (agent) and 9963 (operator):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-agent
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames: [kube-system]
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
    - port: prometheus
      path: /metrics
      interval: 15s
```

Key Cilium metrics:

```
cilium_bpf_map_ops_total{map_name=~"cilium_lb.*"}
cilium_endpoint_regenerations_total
cilium_endpoint_regeneration_time_stats_seconds{scope="total", quantile="0.99"}
cilium_policy_regeneration_time_stats_seconds
cilium_drop_count_total
cilium_forward_count_total
cilium_datapath_conntrack_gc_entries{family="ipv4"}
cilium_services_events_total
```

### 4.5 Node-Level CPU and Softirq

node_exporter provides per-CPU mode breakdown:

```promql
# softirq CPU fraction per node
sum by (instance) (rate(node_cpu_seconds_total{mode="softirq"}[1m]))
/ sum by (instance) (rate(node_cpu_seconds_total[1m]))

# system CPU fraction
sum by (instance) (rate(node_cpu_seconds_total{mode="system"}[1m]))
/ sum by (instance) (rate(node_cpu_seconds_total[1m]))
```

For deeper softirq breakdown, use `/proc/softirqs` via a custom collector or `perf`:

```bash
# On worker node during load
watch -n1 cat /proc/softirqs

# Profile ksoftirqd during burst
perf top -p $(pgrep ksoftirqd) -e cpu-cycles --call-graph dwarf -g
```

### 4.6 iptables-specific Observability

```bash
# Rule count trend (run on worker node, capture to file at each tier)
iptables -t nat -L --line-numbers | wc -l > /tmp/iptables_rules_${TIER}.txt
iptables -t filter -L --line-numbers | wc -l >> /tmp/iptables_rules_${TIER}.txt

# Measure iptables-save duration as a proxy for lock contention
time iptables-save > /dev/null

# iptables lock wait (kernel 4.x+)
cat /proc/net/ip_tables_names
```

### 4.7 IPVS-specific Observability

```bash
# Entry count per virtual service
ipvsadm -ln --stats | awk '{sum+=$5} END {print sum}'

# Total virtual services and real servers
ipvsadm -ln | grep -c "^TCP"
ipvsadm -ln | grep -c "  ->"
```

IPVS connection table (separate from conntrack):

```bash
cat /proc/net/ip_vs_conn | wc -l
```

### 4.8 Grafana Dashboards

Import the following community dashboards and supplement with custom panels:

| Dashboard | Grafana ID |
|-----------|------------|
| Kubernetes / Networking / kube-proxy | 12206 |
| Cilium Agent | 16611 |
| Node Exporter Full | 1860 |
| Conntrack | custom (build from §7 metrics) |

Custom panels to build:

- Service count vs. kube-proxy sync P99 (scatter + time series overlay)
- Conntrack fill % over time, annotated with scaling events
- BPF map entry count vs. service count (Cilium)
- softirq fraction per node over experiment timeline

---

## 5. Scaling Strategy

### 5.1 Service Stub Generator

Use a simple Deployment + ClusterIP Service pair as the unit of scale. Keep the backend pod count at 1 per service to isolate DNAT rule growth from endpoint fan-out effects.

```bash
# generate-services.sh
#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-"load-test"}
START=${2:-1}
END=${3:-500}

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

for i in $(seq "$START" "$END"); do
  cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: svc-stub-${i}
  namespace: ${NAMESPACE}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: svc-stub-${i}
  template:
    metadata:
      labels:
        app: svc-stub-${i}
    spec:
      containers:
      - name: stub
        image: gcr.io/google_containers/pause:3.9
        resources:
          requests:
            cpu: "1m"
            memory: "4Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: svc-stub-${i}
  namespace: ${NAMESPACE}
spec:
  selector:
    app: svc-stub-${i}
  ports:
  - port: 80
    targetPort: 80
EOF
done
```

### 5.2 Scaling Tiers

| Tier | Cumulative Services | Action |
|------|--------------------|-----------------------------|
| T0 | 100 | Baseline (cluster bootstrap) |
| T1 | 500 | +400 |
| T2 | 1000 | +500 |
| T3 | 2000 | +1000 |
| T4 | 3000 | +1000 |
| T5 | 5000 | +2000 |

At each tier:

1. Apply service batch using `generate-services.sh`
2. Wait for all pods Ready and all Endpoints populated:
   ```bash
   kubectl -n load-test wait --for=condition=Available deployment --all --timeout=300s
   ```
3. Wait 2 additional minutes for kube-proxy full sync cycle to complete
4. Record all metrics listed in §7 (use the recording template in §8)
5. Run 5-minute steady-state traffic generation (§6)
6. Run 30-second burst traffic (§6)
7. Snapshot all metrics again

### 5.3 Service Creation Latency Measurement

Measure the wall-clock time from `kubectl apply` of a Service to the moment a new ClusterIP is resolvable and routable on a worker node.

```bash
# service-latency.sh — measure per-tier
#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="latency-test"
SERVICE_NAME="probe-svc-$(date +%s)"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

START_NS=$(date +%s%N)

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE_NAME}
  namespace: ${NAMESPACE}
spec:
  selector:
    app: nonexistent
  ports:
  - port: 8080
    targetPort: 8080
EOF

# Poll until the ClusterIP appears in iptables/IPVS on the node
TARGET_IP=$(kubectl -n "$NAMESPACE" get svc "$SERVICE_NAME" -o jsonpath='{.spec.clusterIP}')

while true; do
  if kubectl debug -it --image=nicolaka/netshoot node/"$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')" \
     -- sh -c "iptables -t nat -L KUBE-SERVICES | grep -q $TARGET_IP" 2>/dev/null; then
    break
  fi
  # For IPVS:
  # if ipvsadm -ln | grep -q "$TARGET_IP"; then break; fi
  # For Cilium:
  # if cilium bpf lb list | grep -q "$TARGET_IP"; then break; fi
  sleep 0.1
done

END_NS=$(date +%s%N)
LATENCY_MS=$(( (END_NS - START_NS) / 1000000 ))
echo "Service programming latency: ${LATENCY_MS}ms (tier: $1, mode: $2)"

kubectl -n "$NAMESPACE" delete svc "$SERVICE_NAME"
```

Run this script 10 times per tier and record min/median/P95/max.

---

## 6. Traffic Generation

### 6.1 Load Generator Setup

Deploy a dedicated load-generator pod on a separate node (use nodeSelector/taint to avoid colocation with stub services):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: load-gen
  namespace: load-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: load-gen
  template:
    metadata:
      labels:
        app: load-gen
    spec:
      nodeSelector:
        role: load-gen          # Label one dedicated node
      containers:
      - name: wrk2
        image: williamyeh/wrk   # or use k6 / hey
        command: ["sleep", "infinity"]
        resources:
          requests:
            cpu: "4"
            memory: "4Gi"
```

### 6.2 Steady-State Profile

Target: sustained 5000 connections/second to 10 randomly selected ClusterIP services, 5-minute window.

```bash
# Using hey (HTTP load generator)
hey -n 1500000 -c 500 -q 100 -t 5 http://<CLUSTERIP>:<PORT>/

# Using wrk2 (latency-accurate)
wrk2 -t8 -c400 -d300s -R5000 --latency http://<CLUSTERIP>:<PORT>/
```

For multi-service fan-out (more realistic), use a small shell loop:

```bash
# steady-load.sh
SERVICES=$(kubectl -n load-test get svc -l app!=load-gen -o jsonpath='{range .items[*]}{.spec.clusterIP}:{.spec.ports[0].port}{"\n"}{end}' | shuf | head -10)
for svc in $SERVICES; do
  wrk2 -t2 -c50 -d300s -R500 --latency "http://$svc/" &
done
wait
```

### 6.3 Burst Profile

Target: 10x spike for 30 seconds, simulating cold-start or failover burst.

```bash
# burst-load.sh
wrk2 -t8 -c2000 -d30s -R50000 --latency http://<CLUSTERIP>:<PORT>/
```

Record conntrack fill % during burst (from Prometheus or direct):

```bash
watch -n1 'cat /proc/sys/net/netfilter/nf_conntrack_count; cat /proc/sys/net/netfilter/nf_conntrack_max'
```

### 6.4 Baseline (No Traffic)

Before each load run, capture a 1-minute no-traffic baseline of all metrics to isolate idle overhead (e.g., kube-proxy sync loops consuming CPU with no active connections).

---

## 7. Metrics Catalogue

Record all metrics at: baseline (T0), post-scale (each tier, no traffic), steady-state traffic, and burst traffic.

### 7.1 Control Plane / kube-proxy

| Metric | Source | Unit |
|--------|--------|------|
| `kubeproxy_sync_proxy_rules_duration_seconds` P50/P99/Max | kube-proxy /metrics | seconds |
| `kubeproxy_sync_proxy_rules_iptables_total{table="nat"}` | kube-proxy /metrics | count |
| `kubeproxy_network_programming_duration_seconds` P99 | kube-proxy /metrics | seconds |
| `kubeproxy_sync_proxy_rules_last_timestamp_seconds` | kube-proxy /metrics | unix ts |
| iptables rule count (`iptables -t nat -L \| wc -l`) | node | count |
| iptables-save wall time | node | seconds |
| IPVS virtual service count | node (`ipvsadm`) | count |
| IPVS real server count | node (`ipvsadm`) | count |
| nft ruleset line count | node (`nft list ruleset`) | count |

### 7.2 Cilium / eBPF

| Metric | Source | Unit |
|--------|--------|------|
| `cilium_bpf_map_ops_total{op="update"}` rate | Cilium /metrics | ops/s |
| `cilium_bpf_map_capacity` per map | Cilium /metrics | entries |
| `cilium_endpoint_regeneration_time_stats_seconds` P99 | Cilium /metrics | seconds |
| `cilium_services_events_total` rate | Cilium /metrics | events/s |
| BPF LB map entry count (`cilium bpf lb list \| wc -l`) | cilium pod | count |
| `cilium_datapath_conntrack_gc_entries` | Cilium /metrics | entries |
| `cilium_drop_count_total` rate | Cilium /metrics | drops/s |

### 7.3 Node CPU / softirq

| Metric | PromQL | Unit |
|--------|--------|------|
| softirq fraction | `rate(node_cpu_seconds_total{mode="softirq"}[1m])` summed/node | fraction |
| system fraction | `rate(node_cpu_seconds_total{mode="system"}[1m])` summed/node | fraction |
| iowait fraction | `rate(node_cpu_seconds_total{mode="iowait"}[1m])` summed/node | fraction |
| ksoftirqd CPU | `perf top` / `pidstat` | % |
| NET_RX softirq rate | `/proc/softirqs` delta NET_RX | irqs/s |
| NET_TX softirq rate | `/proc/softirqs` delta NET_TX | irqs/s |

### 7.4 Conntrack

| Metric | Source | Unit |
|--------|--------|------|
| `node_nf_conntrack_entries` | node_exporter | count |
| `node_nf_conntrack_entries_limit` | node_exporter | count |
| conntrack fill % | computed | % |
| `node_nf_conntrack_stat_drop` rate | node_exporter | drops/s |
| `node_nf_conntrack_stat_insert_failed` rate | node_exporter | fails/s |
| `node_nf_conntrack_stat_early_drop` rate | node_exporter | drops/s |
| conntrack GC run duration | `/proc/net/stat/nf_conntrack` | manual parse |

### 7.5 Latency

| Metric | Tool | Unit |
|--------|------|------|
| Connection establishment P50/P99/P999 | wrk2 latency histogram | ms |
| First-byte latency P99 | wrk2 / hey | ms |
| Service programming latency (§5.3) | custom script | ms |
| DNS resolution latency (CoreDNS) | `dig` + CoreDNS metrics | ms |

CoreDNS latency (ClusterDNS lookup for service FQDNs):

```promql
histogram_quantile(0.99, rate(coredns_dns_request_duration_seconds_bucket[1m]))
```

### 7.6 Network I/O

| Metric | Source | Unit |
|--------|--------|------|
| `node_network_receive_packets_total` rate | node_exporter | pkts/s |
| `node_network_transmit_packets_total` rate | node_exporter | pkts/s |
| `node_network_receive_drop_total` rate | node_exporter | drops/s |
| RX queue depth | `ethtool -S eth0` | count |
| NIC interrupt coalescing settings | `ethtool -c eth0` | — |

---

## 8. Data Recording Template

Use one file per cluster/mode. Fill in at each tier transition.

```markdown
# Experiment Run: <MODE>
Date: YYYY-MM-DD
Cluster: <EKS cluster name>
Kubernetes version: <kubectl version --short>
Kernel version: <uname -r>
Cilium version (if applicable): <cilium version>
AMI ID: <aws ec2 describe-instances...>
Node instance type: m5.2xlarge
kube-proxy mode: <iptables|ipvs|nftables|disabled>
Load balancer algorithm (Cilium): <maglev|random>

## Tier: T<N> — <service count> Services

### Timestamps
Scale-out started:  
Scale-out ended:    
Sync wait ended:    
Steady load started:
Steady load ended:  
Burst load started: 
Burst load ended:   

### Control Plane Metrics (post-scale, no traffic)
kube-proxy sync P99 (s):
kube-proxy sync count (last 5m):
iptables nat rule count:
iptables-save duration (s):
IPVS virtual services:
IPVS real servers:
nft ruleset lines:
BPF LB map entries:

### CPU / softirq (1m avg during steady load)
softirq fraction (all nodes avg):
system fraction:
NET_RX irqs/s:
ksoftirqd peak CPU%:

### Conntrack (peak during burst)
conntrack_entries:
conntrack_limit:
conntrack_fill_%:
conntrack_drop/s:
conntrack_insert_failed/s:

### Latency (steady load, wrk2 output)
P50 (ms):
P99 (ms):
P999 (ms):
First-byte P99 (ms):

### Latency (burst, 30s)
P50 (ms):
P99 (ms):
P999 (ms):
Requests/s achieved:
Error rate (%):

### Service Programming Latency (10 samples)
Min (ms):
Median (ms):
P95 (ms):
Max (ms):

### Cilium-specific (if applicable)
Endpoint regeneration P99 (ms):
BPF map update rate (ops/s):
Drop count rate (drops/s):
Service events rate (events/s):

### Raw Commands Used
```bash
# paste exact commands and output snippets
```

### Anomalies / Observations
- 

### Prometheus Snapshot
Remote write snapshot or tsdb snapshot timestamp: 
```

---

## 9. Risks and Limitations

### Experiment Design Risks

**EKS control-plane opacity.** The EKS API server and etcd are managed and not directly observable. kube-proxy sync timing is influenced by API server latency, which is not under experimental control. Mitigate by running experiments during off-peak hours and discarding runs where API server latency (visible via `kubectl get --raw /metrics | grep apiserver_request_duration`) is elevated.

**CNI plugin interference.** VPC CNI runs its own goroutines and makes AWS API calls (ENI attachment). This generates background system and network I/O independent of the datapath under test. Capture `ipamd` CPU usage separately and exclude from kube-proxy CPU attribution.

**Instance type scheduler noise.** m5.2xlarge on EC2 is subject to hypervisor steal time. Monitor `node_cpu_seconds_total{mode="steal"}` and discard runs where steal > 1% over the measurement window.

**EKS-managed kube-proxy updates.** EKS may update the kube-proxy DaemonSet during the experiment. Pin kube-proxy version via cluster add-on configuration and disable auto-update.

**kube-proxy sync is not purely service-count-driven.** Endpoint changes (pod restarts, node cordons) also trigger syncs. Freeze the cluster (no pod churn, no node changes) during measurements.

### Measurement Limitations

**iptables rule count ≠ lookup cost.** iptables uses a linear scan of KUBE-SERVICES chain per new connection. Rule count is a proxy metric. Actual lookup cost depends on chain ordering, which varies by service creation order. This experiment does not control ordering.

**IPVS connection table vs. conntrack.** IPVS maintains its own connection table in addition to conntrack (unless `--no-conntrack` is used). The separate `/proc/net/ip_vs_conn` table is not exposed by node_exporter by default. This must be scraped manually.

**BPF map lookup overhead is not directly measurable** without kernel-level instrumentation (`bpftrace`, `perf`). `cilium_bpf_map_ops_total` counts operations but not per-operation latency. For deeper analysis, use:
```bash
bpftrace -e 'kretprobe:bpf_map_lookup_elem { @lat = hist(nsecs - @start[tid]); }'
```

**wrk2 latency histograms measure end-to-end RTT**, not pure datapath latency. Network jitter within the VPC, kernel scheduler latency, and application processing time are included. Use same-node loopback tests or DPDK-based tools for sub-µs precision.

**Service creation latency measurement (§5.3)** polls on a single node. Propagation latency across all 5 nodes is not measured. In large clusters, the slowest node defines the effective datapath readiness, not the fastest.

**nftables arm control deviation.** If the nftables cluster uses a different Kubernetes minor version (e.g., 1.31 vs. 1.30), any kernel or API-level behavioral differences between those versions contaminate the comparison. Annotate all nftables results with this caveat.

### Scope Limitations

- This experiment does not test **NetworkPolicy** enforcement overhead, which significantly changes the eBPF datapath complexity.
- **IPv6** and **dual-stack** are not covered.
- **External traffic (NodePort, LoadBalancer)** datapath is not directly tested; all traffic is ClusterIP-internal.
- Results are specific to a **5-node cluster**. Scaling properties (especially kube-proxy sync) differ substantially at 50+ nodes due to watch fanout.
- **Warm vs. cold conntrack table** behavior is not systematically varied. All burst tests start from a partially warm conntrack state.

---

## 10. Behavioral Reference: netfilter vs. eBPF

This section documents the architectural differences relevant to interpreting experiment results. Not a tutorial.

### 10.1 iptables mode

- kube-proxy watches Service/Endpoints via the API server and rewrites the `nat` table on every relevant change.
- The `KUBE-SERVICES` chain is traversed linearly for every new connection requiring DNAT. At N services, worst-case traversal is O(N) iptables rules (partially mitigated by KUBE-SVC-* chain splitting, but not eliminated).
- Rule updates require acquiring the `xtables` kernel lock, which blocks all concurrent iptables operations. At high service counts, sync latency increases and can cause visible kube-proxy sync storms.
- conntrack is mandatory; all DNAT'd connections are tracked in `nf_conntrack` table.
- No in-kernel batching of updates. Each sync cycle rewrites all rules (`iptables-restore --noflush`), which is O(N) in both time and lock hold duration.

### 10.2 IPVS mode

- Uses the Linux IPVS subsystem (LVS) for load balancing; only masquerade and hairpin iptables rules remain.
- Virtual Service + Real Server model maps directly to Service + Endpoint. Updates are O(1) per change (netlink messages to add/modify individual VS/RS entries).
- IPVS uses a hash table for VIP lookup; connection lookup is O(1) regardless of service count.
- kube-proxy sync duration should be significantly lower than iptables at high service counts, but the sync period and `minSyncPeriod` behavior is identical.
- conntrack is still used (unless disabled with `--no-conntrack`, which breaks source IP preservation).
- ipset is used for masquerade rules to avoid iptables rule explosion for individual IPs.

### 10.3 nftables mode

- Replaces the iptables backend with nftables; semantically equivalent to iptables mode from kube-proxy's perspective.
- nftables uses sets and maps internally, which provide O(log N) or O(1) lookup for IP matching versus iptables linear chain traversal.
- Atomic ruleset replacement via `nft -f` avoids the xtables lock problem. Rule updates can be applied as a single atomic batch.
- At equivalent service counts, nftables should exhibit lower sync duration variance than iptables (no lock contention) and faster per-connection DNAT lookup.
- conntrack behavior is identical to iptables mode.

### 10.4 Cilium eBPF datapath

- kube-proxy is entirely removed. Load balancing is implemented in BPF programs attached to `TC ingress` hooks and `XDP` (if supported) on each NIC.
- Service-to-backend mapping is stored in BPF maps (`cilium_lb4_services_v2`, `cilium_lb4_backends_v2`). Lookup is O(1) hash table lookup in BPF map.
- Updates are incremental: only changed entries are written to BPF maps via bpf syscall. No full ruleset regeneration on each sync.
- Endpoint regeneration (not service sync) is the bottleneck for policy changes. For pure ClusterIP traffic with no NetworkPolicy, endpoint regeneration is minimal.
- Maglev consistent hashing pre-computes a lookup table (`cilium_lb4_maglev`). Table size is proportional to backend count × Maglev table size (default 65521 entries per service). At high service+backend counts, memory footprint is higher than iptables.
- conntrack is implemented in BPF (`cilium_ct4_global`), not `nf_conntrack`. `/proc/sys/net/netfilter/nf_conntrack_*` is not relevant for Cilium traffic. Monitor `cilium_datapath_conntrack_gc_entries` instead.
- DSR (Direct Server Return) mode eliminates return-path SNAT overhead. If enabled, return traffic bypasses the node running the service VIP entirely. This changes latency characteristics substantially and must be noted in comparisons.

### 10.5 Comparison Summary

| Property | iptables | IPVS | nftables | Cilium eBPF |
|----------|----------|------|----------|-------------|
| Lookup complexity (new conn) | O(N) rules | O(1) hash | O(1) set/map | O(1) BPF map |
| Update granularity | Full ruleset rewrite | Per-entry netlink | Atomic batch | Per-entry bpf() |
| Kernel lock on update | xtables lock (global) | IPVS-specific | None (atomic) | None |
| conntrack | nf_conntrack | nf_conntrack | nf_conntrack | BPF CT (own) |
| softirq contribution | High at scale (chain walk) | Lower | Lower | Lowest (early drop/bypass possible) |
| Rule/map footprint | High (O(N×E) rules) | Low (VS/RS entries) | Moderate (sets) | Moderate (BPF maps, Maglev table) |
| kube-proxy process required | Yes | Yes | Yes | No |
| Kernel version requirement | 3.x+ | 3.x+ | 5.2+ (stable) | 5.4+ (recommended: 5.10+) |

---

*End of blueprint. All shell commands are intended for AL2023 on EKS with the tool versions specified. Validate all commands in a dev cluster before executing at scale.*
