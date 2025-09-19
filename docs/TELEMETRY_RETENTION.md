# Telemetry Retention & Aggregation Strategy

MIHAS now captures client and service telemetry in the `api_telemetry` Supabase table via the `/api/analytics/telemetry` endpoint. Metrics are written in small background batches so that HTTP response handling stays fast while telemetry is persisted for long-term analysis.

## Ingestion Pipeline

1. **Client instrumentation** – `MonitoringService` buffers API latency, error, and custom metrics and writes them to a background queue without blocking active requests.
2. **Batch flush** – The queue is flushed every 5 seconds (or sooner on failures) to `/api/analytics/telemetry`. Errors trigger exponential backoff and pending batches are cached so data is not lost on reloads or process restarts.
3. **Server persistence** – The Vercel function validates payloads, enforces rate limits, and stores the events in `api_telemetry`. Aggregated summaries are returned to admins on GET requests.

## Storage Model

`api_telemetry` stores both raw events and derived attributes that power dashboards:

| Column | Purpose |
| --- | --- |
| `type` | `api_call`, `custom_metric`, `error`, or `alert` |
| `service` / `endpoint` | Identify which downstream service or REST path emitted the metric |
| `duration_ms`, `success`, `status_code` | Request latency and outcome, used to compute SLOs |
| `metric_name`, `metric_value` | Arbitrary counters or gauges for domain-specific monitoring |
| `level`, `message`, `metadata` | Enriched context for alerting and investigations |
| `occurred_at` | Timestamp retained for trend analysis |

Indexes on `(service, endpoint)`, `occurred_at`, and `type` keep analytics queries responsive.

## Retention & Aggregation

- **Raw telemetry retention** – `cleanup_old_metrics()` prunes telemetry older than 90 days, ensuring long-term storage does not bloat while keeping enough history for trend baselines.
- **Rolling summaries** – Admin dashboards call `analyticsService.getTelemetrySummary()` to retrieve batched rollups (avg latency, error rate, P95) for the requested window. The same summary powers automated health checks.
- **Autoscaling signals** – Because 90 days of latency/error history are available, operations can compute dynamic thresholds (e.g., P95 > 1500 ms or error rate > 30%) to trigger scale-out alerts. Custom metrics captured through `trackMetric` can encode queue depth or worker saturation, feeding the same alerting pipeline.
- **Alert surface** – `MonitoringService.createAlert` promotes breaches directly into the telemetry stream so paging policies or dashboards can react in near real time.

## Operational Notes

- Telemetry flushes continue when the browser tab is backgrounded; pending batches are persisted to storage so they survive process restarts.
- GET `/api/analytics/telemetry` is admin-only and rate-limited to protect Supabase. POST ingestion is similarly rate-limited to mitigate noisy clients.
- The retention function can be tuned per-environment if a longer history is required. Consider exporting older data to cold storage before changing the retention window.

This strategy keeps granular request telemetry available for at least three months, provides immediate health summaries for dashboards, and supplies stable signals for autoscaling and alert automation.
