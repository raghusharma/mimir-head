#kubernetes 
# ReplicaSet
`replicaset.yaml`
```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: myapp-replicaset
  labels:
    app: myapp
    type: frontend
spec:
  template:
    metadata:
      name: myapp-pod
      labels:
        app: myapp
        type: frontend
    spec:
      containers:
      - name: nginx-controller
        image: nginx
  replicas: 3
  selector:
    matchLabels:
      type: frontend
```
The replicaset defines how many replicas of the pods should be run at any time.