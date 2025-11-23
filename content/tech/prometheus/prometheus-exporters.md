Prometheus has many official exporters listed here:
[Exporters and integrations](https://prometheus.io/docs/instrumenting/exporters/)

Some common exporters:
1. Node Exporter: For Linux metrics
2. cAdvisor: For container metrics. This is embedded into Kubelet.
3. [Nvidia GPU Exporter](https://github.com/mindprince/nvidia_gpu_prometheus_exporter)

You can create your own exporter using:
[Writing Exporters](https://prometheus.io/docs/instrumenting/writing_exporters/)

Prometheus comes with client libraries that can be used to send custom metrics from your application. Some of the supported languages are:
1. Go
2. Python
3. Rusy
4. Java
5. Ruby
among others.

