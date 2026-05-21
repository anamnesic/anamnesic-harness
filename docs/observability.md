# Observability

This doc lists log, metric, and trace artifacts that are safe for agents to read.

## Local logs and registries
- ~/.kairos/sessions/ - session registry for background/bridge sessions (used by ps/logs/attach/kill when enabled).
- ~/.kairos/unknown-tools.json - unknown tool calls captured by the VS Code extension.
- ~/.kairos/dead-models.json - models marked unavailable or EOL by the VS Code extension.
- ~/.kairos/settings.json - user settings.
- .kairos/settings.json - project settings.
- .kairos/settings.local.json - local settings.
- ~/.kairos/cache/changelog.md - cached changelog (if present).

## Bridge / remote-control logs
- System temp dir + claude/bridge-session-*.log (created by bridge sessions; path uses os.tmpdir()).
- When supported, a debug file can be forced via the bridge --debug-file flag.

## OpenTelemetry (metrics, logs, traces)
- Enable exporters with env vars:
  - OTEL_TRACES_EXPORTER=console|otlp|none
  - OTEL_METRICS_EXPORTER=console|otlp|prometheus|none
  - OTEL_LOGS_EXPORTER=console|otlp|none
  - OTEL_EXPORTER_OTLP_PROTOCOL=grpc|http/json|http/protobuf
  - OTEL_EXPORTER_OTLP_ENDPOINT
  - OTEL_EXPORTER_OTLP_HEADERS
- Enhanced tracing requires the ENHANCED_TELEMETRY_BETA feature flag plus:
  - KAIROS_ENHANCED_TELEMETRY_BETA=1 or ENABLE_ENHANCED_TELEMETRY_BETA=1
- Prompt contents are redacted unless OTEL_LOG_USER_PROMPTS=1 is set.

## Diagnostics tips
- Read existing logs before reproducing to keep fixes focused.
- Avoid committing user data captured in logs.
