#kubernetes
## Node Types:
1. Master nodes (Control Plane)
2. Worker nodes (Data Plane)

Master nodes / Control Plane Components:
1. Kube-apiserver
2. [[etcd]]
3. Scheduler
	- Decides which pod goes to which node
	- Does not actually place(or launch) the pod on the node. Kubelet does that
4. [[controller-manager|Controller Manager]]
	- Node Controller
	- Replication Controller
	- & others

Worker nodes / Data Plane Components:
1. Kubelet
	- Registers nodes with the cluster
	- creates/deletes pods
	- monitors nodes & pods
2. Kube-proxy
	- Responsible for creating iptables rules on the nodes

containerd
- ctr: tool to debug containerd
	- limited features
	- not very user friendly
- nerdctl
	- very similar to docker
	- docker like cli for containerd

```bash
nerdctl run # Run container
```

![[kubernetes-architecture]]
