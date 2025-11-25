# Runbook: No Metrics Created

## Alert Details

- **Alert Name:** `NoMetricsCreated`
- **Severity:** ℹ️ **INFO**
- **Threshold:** No metrics created in the last hour
- **Prometheus Expression:**
  ```promql
  rate(metrics_created_total[1h]) == 0
  ```

## Symptoms

- No business activity detected
- No new metrics being created
- Could indicate:
  - Weekend/off-hours (expected)
  - User inactivity (expected)
  - Authentication issues (investigate)
  - Application bug (investigate)

## Quick Check

```bash
# Check if metrics are being created
curl -s "http://localhost:9090/api/v1/query?query=rate(metrics_created_total[1h])" | jq '.data.result[0].value[1]'

# Check recent API activity
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[1h])" | jq '.data.result[0].value[1]'

# Check if users are authenticated
tail -n 100 logs/app.log | grep -i "login\|auth"

# Try to create a metric manually
curl -X POST http://localhost:3000/api/v1/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"name":"Test Metric","category":"other"}'
```

## Diagnosis

### Is this expected?

- **Weekend/Holiday:** Normal inactivity
- **Off-hours:** Normal (e.g., 2 AM)
- **Known maintenance:** Expected

### Is there API traffic?

```bash
# Check request rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[1h])" | jq

# If no traffic at all:
# - Check if application is running
# - Check if users can access the app

# If traffic but no metrics created:
# - Check authentication
# - Check for errors
# - Check application logs
```

### Check for Errors

```bash
# Recent errors
tail -n 200 logs/app.log | grep -i "error"

# Authentication failures
tail -n 200 logs/app.log | grep -i "auth.*fail"

# Database errors
tail -n 200 logs/app.log | grep -i "database\|query.*error"
```

## Resolution

### If Expected Inactivity

No action needed. Alert will resolve when activity resumes.

### If Authentication Issues

```bash
# Check auth service
curl http://localhost:3000/api/v1/auth/login

# Check user database
psql -h localhost -U mdl -d mdl -c "SELECT count(*) FROM users;"

# Review auth logs
tail -n 100 logs/app.log | grep -i "auth"
```

### If Application Bug

```bash
# Check for errors
tail -n 500 logs/app.log | grep -E "error|exception"

# Test metrics endpoint
curl -X GET http://localhost:3000/api/v1/metrics

# Check database connectivity
psql -h localhost -U mdl -d mdl -c "SELECT count(*) FROM metrics;"
```

## Prevention

- Adjust alert threshold for known quiet periods
- Add time-based alert suppression (e.g., weekends)
- Set up synthetic monitoring to detect real issues
- Monitor user activity patterns

**This is an informational alert.** Only investigate if:
1. During business hours
2. Unexpected inactivity
3. Combined with other alerts

---
**Last Updated:** November 23, 2025
