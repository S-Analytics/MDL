# Runbook: Unusual Domain Activity

## Alert Details

- **Alert Name:** `UnusualDomainActivity`
- **Severity:** ℹ️ **INFO**
- **Threshold:** Domain creation rate increased by >10 compared to 24h ago
- **Prometheus Expression:**
  ```promql
  (
    rate(domains_created_total[1h]) 
    - 
    rate(domains_created_total[1h] offset 24h)
  ) > 10
  ```

## Symptoms

- Unusual spike in domain creation
- Could indicate:
  - Legitimate business activity (good)
  - New user onboarding (good)
  - Data migration (expected)
  - Automated testing (investigate)
  - Potential abuse (investigate)

## Quick Check

```bash
# Current domain creation rate
curl -s "http://localhost:9090/api/v1/query?query=rate(domains_created_total[1h])" | jq '.data.result[0].value[1]'

# Compare to yesterday
curl -s "http://localhost:9090/api/v1/query?query=rate(domains_created_total[1h]offset 24h)" | jq '.data.result[0].value[1]'

# Total domains
curl -s http://localhost:3000/metrics | grep "mdl_domains_total"

# Recent domain creations in logs
tail -n 200 logs/app.log | grep -i "domain.*creat"
```

## Diagnosis

### Is this legitimate activity?

**Check with team:**
1. Is there a marketing campaign?
2. Is there onboarding of new users?
3. Is there a data migration happening?
4. Is there a known business event?

**Check user patterns:**
```bash
# Check who's creating domains
tail -n 500 logs/app.log | grep "domain.*created" | grep -oP 'user_id=[^,]+' | sort | uniq -c | sort -rn

# Single user creating many domains?
# Multiple users creating domains?
```

### Check for anomalies

```bash
# Check domain names for patterns
psql -h localhost -U mdl -d mdl -c "SELECT name, created_at FROM domains ORDER BY created_at DESC LIMIT 20;"

# Look for:
# - Generated/random names (suspicious)
# - Similar patterns (bulk import or automation)
# - Meaningful names (likely legitimate)
```

### Check request patterns

```bash
# Request rate to domains endpoint
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{path=~\".*domains.*\"}[1h])" | jq

# Check for single IP making many requests
tail -n 1000 logs/app.log | grep "domains" | grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -10
```

## Resolution

### If Legitimate Activity

No action needed. Document the reason for future reference.

```
📝 Note: Domain creation spike due to [reason]
Date: [date]
Normal expected behavior.
```

### If Bulk Import/Migration

Monitor to ensure it completes successfully:

```bash
# Watch creation rate
watch -n 60 'curl -s "http://localhost:9090/api/v1/query?query=rate(domains_created_total[5m])" | jq ".data.result[0].value[1]"'

# Monitor for errors
tail -f logs/app.log | grep -i "error\|fail"
```

### If Suspicious Activity

**Investigate the user:**
```bash
# Get user details
psql -h localhost -U mdl -d mdl -c "SELECT * FROM users WHERE id = '[user_id]';"

# Check user's recent activity
tail -n 1000 logs/app.log | grep "[user_id]"

# Check if account is legitimate
# - Email domain
# - Registration date
# - Activity patterns
```

**If abuse detected:**
1. Document the incident
2. Contact user if legitimate account
3. Suspend account if clear abuse
4. Consider rate limiting

### If Automation/Bot

```bash
# Add rate limiting for domain creation
# (Requires code change)

# Temporary: Monitor and alert if continues
# Permanent: Implement rate limiting per user
```

## Prevention

- Implement per-user rate limiting
- Add CAPTCHA for high-volume actions
- Monitor user behavior patterns
- Set up anomaly detection
- Add user verification for new accounts
- Implement abuse detection rules

**This is an informational alert.** Only take action if:
1. Activity is unexplained
2. Suspicious patterns detected
3. Performance impact observed

## Follow-up Actions

If this was legitimate, consider:
- Adjusting alert threshold
- Adding time-based suppression
- Documenting normal spikes (e.g., "First Monday of month: bulk imports")

If this was abuse, create tickets for:
- Implement rate limiting
- Add abuse detection
- User verification improvements

---
**Last Updated:** November 23, 2025
