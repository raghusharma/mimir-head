#observability #prometheus 
- Scrapes metrics from an endpoint

![[prometheus-architecture-01.png]]

# Prometheus Core Components:
1. Worker to retrieve/scrape the data/metrics from different targets/endpoints
2. Time Series Database (TSDB)
3. HTTP Server for interacting with it, and entering the PromQL queries

# Other components of prometheus universe:
1. [[prometheus-exporters|Exporters]]: Pulls/Retrieves data from the exporters
   Prometheus works on pull based model
2. Pushgateway: The pull based model has limitations, if there are short lived jobs, they won't be able to export the metrics in enough time for prometheus to pull. Pushgateways are for this. The short lived jobs can push to the Pushgateway, and prometheus can then pull these.
3. Service Discovery: Prometheus needs to know the targets it has to scrape. To dynamically populate the list of the targets, service discovery is used.
4. AlertManager: For sending alerts. Prometheus does not send alert itself. It just generates the alerts, and sends to AlertManager to handle the sending the alerts to different channels.
5. PromQL: Query language to fetch data from the TSDB of Prometheus

