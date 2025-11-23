#kubernetes 

- key-value store
- port 2379
- etcdctl : client for etcd
- `kubectl get` command fetches data from etcd cluster
- Any changes to the kubernetes cluster (nodes addition/removal, pods, etc.) gets updated in etcd.
- apiserver is the only component that interacts with the etcd database.

## etcd commands
etcd api v2 & v3 have different commands
```bash
etcdctl get key1
etcdctl set key1 value1 # etcd api v2
etcdctl put key1 value1 # etcd api v3
etcdctl member list # list members of the etcd cluster
```

Data stored in etcd is the info regarding:
- nodes
- pods
- configs
- secrets
- accounts
- roles
- bindings
- & so on among many others

## Directory Structure of etcd store for kubernetes
```
/registry/
|-- minions (nodes)
|-- pods
|-- replicasets
|-- deployments
|-- ... etc.
```
`etcdctl get /registry/pods --keys-only prefix=true` :
	/registry/pods is the path of the key

## kube-apiserver workflow:
1. Authenticate user
2. Validate request
3. Retrieve data
4. Update etcd
5. Scheduler (to schedule pods on the nodes)
6. Kubelet (to run containers/pods on the node)