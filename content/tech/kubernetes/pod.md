#kubernetes 
- Pod is the minimum deployable unit in Kubernetes.
- You don't deploy containers in Kubernetes, you deploy an abstraction over the container, and this is called Pod.
- A pod can have 1 or more containers in it.
- Kubelet is the component responsible for creating the actual container on the node

This is what the yaml looks like for the any (actually most of them look like this, not all) Kubernetes Object:
```yaml
apiVersion:
kind:
metadata:
  ...
  ...
spec:
  ...
  ...
```

| kind       | version |
| ---------- | ------- |
| Pod        | v1      |
| Service    | v1      |
| ReplicaSet | apps/v1 |
| Deployment | apps/v1 |
For pod definition:
`pod-definition.yaml:`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    app: myapp
    type: frontend
  spec:
    containers:
      -name: nginx-container
      image: nginx
```

We can use `kubectl` to create the pod using this yaml:
```bash
kubectl create -f pod-definition.yaml # or
kubectl apply -f pod-definition.yaml
kubectl get pods # list pods
kubectl describe pod myapp # Get pod details
```
