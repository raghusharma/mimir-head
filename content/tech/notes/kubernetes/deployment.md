---
title: Deployment in Kubernetes
draft: "true"
tags:
  - kubernetes
---
- Rolling updates
- Rollback changes
- pause/resume
`deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```
A replicaset is created for every deployment, and when a deployment is updated, a new replicaset is created.
## Rollout Strategy for Deployment
`.spec.strategy` defines the strategy used to replace pods