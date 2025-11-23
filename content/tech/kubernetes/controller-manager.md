#kubernetes 

Controller is a process that continuously monitors the status of different components & remediates.
Controllers for many things:
- deployment
- replica set
- namespace
- endpoints
- stateful set
- pv-protection
-  & so on

## Node Controller
- monitors nodes every 5s
- node monitor period: 5s
- node monitor grace period: 40s (wait before marking a node unreachable)
- pod eviction timeout: 5s (wait after node is unreachable, before evicting pods. Deprecated in v1.26)

## Replication Controller
- monitors replica sets
- make sure desired number of pods are available at all times
- creates another pod if a pod dies

All controllers are packed into a single process: `kube-controller-manager`
