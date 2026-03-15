# Title

How Kubernetes Feels Event-Driven: WATCH, Reconnects, and Real-World Trade-offs
# Description

Kubernetes often appears to behave like an event-driven system: nodes react quickly to scheduling decisions, controllers respond immediately to changes, and commands like `kubectl get` or `kubectl logs` feel close to real time — even in large clusters.

A common mental model is that nodes poll the API server or that the API server pushes updates to components. Both approaches break down at scale due to latency and load amplification.

This talk explains why Kubernetes instead relies on HTTP WATCH — a client-initiated, long-lived connection used by nodes, controllers, and `kubectl` to observe state changes.

The session focuses on how WATCH behaves in real systems: API server restarts, broken connections and reconnects, missed events versus missed state, and reconnect bursts in large clusters. It builds a production-grade mental model of what WATCH guarantees, what it does not, and how these trade-offs affect controller behavior and API server load.

# Benefits to the Ecosystem

- Helps practitioners reason about Kubernetes behavior during API server restarts, network interruptions, and scaling events
- Clarifies the guarantees and limits of WATCH, reducing incorrect assumptions about event delivery and consistency
- Improves the design and debugging of controllers, operators, and platform automation that rely on informers
- Enables more informed decisions around API server scaling, tuning, and operational expectations
- Reduces reliance on folklore and oversimplified explanations when diagnosing perceived lag or missed updates in clusters

# Target Audience

Intermediate