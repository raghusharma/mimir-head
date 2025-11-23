#kubernetes 
Connect 1 kubernetes app to another app or externally

Types:
1. ClusterIP
2. NodePort
3. LoadBalancer

![[service-01.jpeg|250]]

# NodePort Service
![[nodeport-01.jpeg|300]]
service-definition.yaml:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: NodePort
  ports:
  - targetPort: 80
    port: 80
    nodePort: 30008
  selector:
    app: myapp
    type: frontend
```

`targetport`: Optional. If omitted, same as "port"
`port`: Mandatory
`nodePort`: Optional. If omitted, any port assigned between 30000 - 32767
![[nodeport-02.jpeg|400]]
Even if a pod is not hosted on a node, it ca still be accessed from that node's IP address.

# ClusterIP Service
![[clusterip-01.jpeg|300]]
For communication between pods within the cluster.
service-definition.yaml:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: clusterIP
  ports:
  - targetPort: 80
    port: 80
  selector:
    app:myapp
    type: backend
```
or
`kubectl create service clusterip <svc_name> --tcp=3306:3306 --dry-run=client -o yaml`

# LoadBalancer Service
- Similar to NodePort service
- Works with supported cloud platforms: AWS, GCP, Azure
- Utilizes the native load balancers of that cloud platform
- In case you are running this on any unsupported cloud platform or on local VMs or Virtualbox, it will just launch NodePort like service.
  In cloud platforms, the cloud controller manager (CCM) is responsible for creating the load balancer.
- Service definition is very similar to NodePort service, just the type of service will be `LoadBalancer`.

# Important

This is from the output of the cluster I set up:
```bash
k get svc
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.0.0.1     <none>        443/TCP        150d
my-svc       NodePort    10.0.0.202   <none>        80:32766/TCP   150d
```

Both NodePort & ClusterIP type of services get the "ClusterIP".
NodePort can also be accessed from within the cluster.
In fact,
ClusterIP + Port on the Node = NodePort

Even the definition file is also the same, except the additional Node Port that is mentioned in the NodePort service.