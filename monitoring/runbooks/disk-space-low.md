# Runbook: Disk Space Low

## Alert Details

- **Alert Name:** `DiskSpaceLow`
- **Severity:** ⚠️ **WARNING**
- **Threshold:** Available disk space < 10% for 5 minutes
- **Prometheus Expression:**
  ```promql
  (
    node_filesystem_avail_bytes{mountpoint="/",job="node-exporter"} 
    / 
    node_filesystem_size_bytes{mountpoint="/",job="node-exporter"}
  ) < 0.10
  ```

## Symptoms

- Low disk space warnings
- Application may fail to write logs
- Database writes may fail
- Unable to create temporary files

## Quick Check

```bash
# Check disk usage
df -h

# Check largest directories
du -sh /* 2>/dev/null | sort -rh | head -10

# Check log directory size
du -sh logs/
ls -lh logs/
```

## Diagnosis

### Find what's using space

```bash
# Top 20 largest directories
du -ah / 2>/dev/null | sort -rh | head -20

# Large log files
find /var/log -type f -size +100M -exec ls -lh {} \;
find logs/ -type f -size +100M -exec ls -lh {} \;

# Large database files
du -sh /var/lib/postgresql/
```

## Resolution

### Clean Up Logs

```bash
# Archive old logs
cd logs/
gzip *.log.old
mv *.log.gz archive/

# Delete very old logs
find logs/ -name "*.log.gz" -mtime +90 -delete

# Truncate current log if huge
: > logs/app.log
```

### Clean Up Application

```bash
# Clean npm cache
npm cache clean --force

# Clean node_modules and reinstall
rm -rf node_modules
npm install

# Clean build artifacts
rm -rf dist/ build/

# Clean temporary files
rm -rf /tmp/*
```

### Clean Up Database

```bash
# Vacuum database to reclaim space
psql -h localhost -U mdl -d mdl -c "VACUUM FULL;"

# Check database size
psql -h localhost -U mdl -d mdl -c "SELECT pg_size_pretty(pg_database_size('mdl'));"

# Archive old data if applicable
```

### Emergency: Delete Non-Critical Data

```bash
# Only if critical situation

# Delete old coverage reports
rm -rf coverage/

# Delete old test results
rm -rf test-results/

# Delete Docker images
docker system prune -a

# Delete old logs
rm -f logs/*.log.old
```

## Prevention

- Implement log rotation
  ```bash
  # Install logrotate
  sudo apt-get install logrotate  # Linux
  
  # Create /etc/logrotate.d/mdl-api
  /Users/chris/GitHub/MDL/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 chris staff
  }
  ```

- Monitor disk usage trends
- Set up automated cleanup jobs
- Use log aggregation (send logs to Loki)
- Archive old data to cloud storage
- Set database table retention policies

**Escalate if:** Cannot free enough space, need to provision more disk

---
**Last Updated:** November 23, 2025
