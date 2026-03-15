---
event:
  - KCD Kochi
---

# Title:
One Packet, Two Worlds: The Real Cost of kube-proxy (iptables) and What eBPF Changes

# Abstract:

What actually happens when a packet enters your Kubernetes cluster?

In traditional kube-proxy + iptables mode, packets traverse netfilter chains, conntrack tables, and rule sets that grow with cluster size. In eBPF-based implementations like Cilium, that same packet may be processed by in-kernel programs using direct map lookups — bypassing much of the legacy stack.

In this session, we will trace a single packet through two Kubernetes networking models:
- kube-proxy + iptables
- eBPF-based datapath (XDP/TC)

Using diagrams and real debugging examples (tcpdump vs Hubble, iptables vs BPF maps), we will examine:
- Where latency and scaling differences arise
- What changes for observability and troubleshooting
- Operational tradeoffs platform engineers must understand

By the end of this talk, attendees will be able to:
- Explain the packet path in both networking models
- Identify when iptables becomes a scaling bottleneck
- Understand how eBPF alters debugging workflows
- Make informed decisions about adopting eBPF-based networking in production clusters

This talk is designed for Kubernetes platform engineers and SREs who operate production clusters and want a clear mental model of how eBPF-based networking differs from traditional kube-proxy + iptables setups. No prior kernel knowledge required.