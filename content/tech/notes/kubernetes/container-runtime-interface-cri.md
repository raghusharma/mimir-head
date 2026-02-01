#kubernetes 
## CRI: Container Runtime Interface:
- Supports containerd, rkt, etc.
- docker is not cri compatible
- K8s needs container runtime to be cri compatible. For docker, dockershim is used to run with K8s
- crictl:
	- tool used to use cri compatible container runtimes
	- works across multiple runtimes
	- nerdctl only for containerd
	- used for debugging purpose only

```bash
crictl pull busybox
crictl images
crictl ps -a
crictl exec -i -t <containerid> <command>
crictl pods # Also aware of pods (docker was not)
```

![[cri-interaction]]