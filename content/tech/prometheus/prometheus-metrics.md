#observability #prometheus

`<metric_name>[{<label_1="value_1">,<label_N="value_N">}] <metric_value>`

`node_cpu_seconds_total{cpu="0",mode="idle"} 258277.86`
represents the number of seconds CPU (CPU 0) spent in the given mode (idle). Labels provide information on which CPU the metrics is for, and for which state.
Similarly for other CPUs:
```
node_cpu_seconds_total{cpu="0",mode="idle"} 258277.86
node_cpu_seconds_total{cpu="1",mode="idle"} 427262.54
node_cpu_seconds_total{cpu="2",mode="idle"} 283288.12
node_cpu_seconds_total{cpu="3",mode="idle"} 258202.33
```

## Types of metrics:
1. Counter (ever increasing)
2. Gauge (Can increase/decrease)
3. Histogram (Don't understand yet)
4. Summary (Similar to Histogram, but don't understand yet)