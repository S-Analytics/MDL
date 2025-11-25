# Runbook: High Request Rate

## Alert Details

- **Alert Name:** `HighRequestRate`
- **Severity:** ⚠️ **WARNING**
- **Threshold:** Request rate > 100 req/s for 5 minutes
- **Prometheus Expression:**
  ```promql
  rate(http_requests_total[5m]) > 100
  ```

## Symptoms

- Unusual traffic spike
- Increased server load
- Potential performance degradation
- Higher resource consumption

## Quick Check

```bash
# Current request rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | jq '.data.result[0].value[1]'

# Top requesting paths
curl -s "http://localhost:9090/api/v1/query?query=topk(10,rate(http_requests_total[5m]))" | jq -r '.data.result[] | "\(.metric.path): \(.value[1]) req/s"'

# Check for unusual IPs in logs
tail -n 1000 logs/app.log | grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -n 10
```

## Diagnosis

### Is this legitimate traffic?

1. **Marketing Campaign:** Check if marketing team launched campaign
2. **Business Event:** Check for legitimate business reason
3. **DDoS/Attack:** Check for suspicious patterns:
   - Single IP or IP range
   - Specific endpoint being hammered
   - Unusual user agents
   - Failed authentication attempts

### Traffic Analysis

```bash
# Request distribution by path
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])by(path)" | jq

# Status code distribution
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])by(status_code)" | jq

# Check error rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])" | jq
```

## Resolution

### Legitimate Traffic Spike

1. **Scale Up:**
   - Add more application instances
   - Increase cache capacity
   - Increase database connections

2. **Optimize Performance:**
   - Enable caching for hot endpoints
   - Add CDN for static assets
   - Implement response compression

### Malicious Traffic

1. **Rate Limiting:**
   ```typescript
   // Add to application
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

2. **Block Suspicious IPs:**
   ```bash
   # Add to firewall or reverse proxy
   iptables -A INPUT -s [malicious-ip] -j DROP
   ```

3. **Enable DDoS Protection:**
   - Use Cloudflare or similar
   - Enable challenge pages
   - Implement CAPTCHA for suspicious traffic

## Prevention

- Implement rate limiting
- Use CDN and caching
- Monitor traffic patterns
- Set up DDoS protection
- Implement auto-scaling

**See Also:** [high-error-rate.md](./high-error-rate.md)

---
**Last Updated:** November 23, 2025
