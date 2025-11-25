# Runbook: High Memory Usage

## Alert Details

- **Alert Name:** `HighMemoryUsage`
- **Severity:** ⚠️ **WARNING**
- **Threshold:** Memory usage > 80% for 5 minutes
- **Prometheus Expression:**
  ```promql
  (
    process_resident_memory_bytes 
    / 
    node_memory_MemTotal_bytes{job="node-exporter"}
  ) > 0.80
  ```

## Symptoms

- Application using excessive memory
- Slow performance
- Potential crashes if OOM
- Garbage collection taking longer

## Quick Check

```bash
# Application memory usage
ps aux | grep node | awk '{print $4, $6, $11}'

# Node.js heap usage
curl -s http://localhost:3000/metrics | grep "nodejs_heap"

# System memory
free -h  # Linux
vm_stat  # macOS

# Check for memory growth trend
curl -s "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes[30m]" | jq
```

## Diagnosis

### Is memory growing over time?

```bash
# Watch memory usage
watch -n 5 'ps aux | grep node | awk "{print \$4, \$6}"'

# Graph in Grafana
open http://localhost:3001/d/mdl-infrastructure
```

**Growing steadily** → Memory leak  
**Stable high** → Normal for workload or needs optimization  
**Spiky** → Garbage collection issues or temporary load

### Check for memory leaks

```bash
# Check heap statistics
curl -s http://localhost:3000/metrics | grep -E "nodejs_heap|nodejs_external_memory"

# Look for:
# - heap_used growing continuously
# - external_memory growing
# - heap approaching heap size limit
```

### Common causes

1. **Large responses not garbage collected**
2. **Event listeners not removed**
3. **Cached data growing unbounded**
4. **Circular references**
5. **Timers/intervals not cleared**

## Resolution

### Immediate (Restart)

```bash
# Restart to free memory
lsof -ti :3000 | xargs kill
npm run dev

# Monitor after restart
watch -n 5 'ps aux | grep node'
```

### Increase Memory Limit (Temporary)

```bash
# Start with higher memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# Monitor to see if problem returns
```

### Investigate Leak (if recurring)

```bash
# Enable heap snapshots
# Add to src/index.ts:
process.on('SIGUSR2', () => {
  const heapdump = require('heapdump');
  const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
  heapdump.writeSnapshot(filename);
  console.log('Heap snapshot written to', filename);
});

# Install heapdump
npm install heapdump

# Take snapshot
kill -USR2 $(lsof -ti :3000)

# Analyze in Chrome DevTools
# chrome://inspect → Open dedicated DevTools → Memory → Load snapshot
```

### Optimize Memory Usage

1. **Limit cache size:**
   ```typescript
   // Add max size to cache
   const cache = new LRU({ max: 1000, maxSize: 50000000 }); // 50MB
   ```

2. **Stream large responses:**
   ```typescript
   // Instead of loading all data:
   const data = await getAllData(); // Bad
   res.json(data);
   
   // Stream data:
   const stream = db.stream('SELECT * FROM large_table');
   stream.pipe(JSONStream.stringify()).pipe(res);
   ```

3. **Clear timers/listeners:**
   ```typescript
   // Always clear
   const interval = setInterval(() => {}, 1000);
   // Later:
   clearInterval(interval);
   
   // Remove listeners
   emitter.removeListener('event', handler);
   ```

## Prevention

- Regular memory profiling
- Monitor heap usage trends
- Implement memory limits
- Use streaming for large data
- Profile for leaks in development
- Add memory usage tests
- Implement circuit breakers

**See Also:** [api-instance-down.md](./api-instance-down.md)

---
**Last Updated:** November 23, 2025
