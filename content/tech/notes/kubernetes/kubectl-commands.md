#kubernetes 

`kubectl explain`: Get documentation for a resource.
```bash
kubectl explain replicaset
kubectl explain deployment # Outputs the outline of the specification
kubectl explain deployment.spec # For details about some specific section
```

`kubectl api-resources`: Print the supported API resources on the server
```bash
$ kubectl api-resources
NAME               SHORTNAMES   APIVERSION   NAMESPACED   KIND
bindings                        v1           true         Binding
componentstatuses  cs           v1           false        ComponentStatus
configmaps         cm           v1           true         ConfigMap
endpoints          ep           v1           true         Endpoints
events             ev           v1           true         Event
limitranges        limits       v1           true         LimitRange
namespaces         ns           v1           false        Namespace
nodes              no           v1           false        Node
...
daemonsets         ds           apps/v1      true         DaemonSet
deployments        deploy       apps/v1      true         Deployment
replicasets        rs           apps/v1      true         ReplicaSet
statefulsets       sts          apps/v1      true         StatefulSet
...
```
namespaced & non-namespaced resources can be filtered:
```bash
$ kubectl api-resources --namespaced=true` or
$ kubectl api-resources --namespaced`
```
`$ kubectl api-resources --namespaced=false`

Check what operations are allowed for current user:
```bash
k auth can-i --list
```
