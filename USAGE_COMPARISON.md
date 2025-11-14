# MDL - Usage Options Comparison

MDL can be used in two different ways. Choose the option that best fits your needs:

## 📊 Comparison Chart

| Feature | Web Server | CLI |
|---------|------------|-----|
| **User Experience** | Browser-based | Command-line |
| **Installation** | `npm install` | `npm install` |
| **Requires Node.js** | ✅ Yes | ✅ Yes |
| **Requires Terminal** | ✅ Yes | ✅ Yes |
| **Dashboard UI** | ✅ Yes | ❌ No |
| **Runs Offline** | ✅ Yes | ✅ Yes |
| **Cross-Platform** | ✅ Yes | ✅ Yes |
| **API Access** | ✅ Yes | ❌ No |
| **Best For** | Interactive use | Automation |

## 🎯 When to Use Each Option

### Web Server (Recommended for Interactive Use)
```bash
npm start
# Open http://localhost:3000/dashboard
```

**Best for:**
- ✅ Development and testing
- ✅ Server deployments
- ✅ Integration with other services
- ✅ Remote access over network
- ✅ Container deployments

**Advantages:**
- Lightweight
- Easy to integrate with other tools
- Can be accessed remotely
- Better for CI/CD pipelines
- Easier to debug and develop

**Disadvantages:**
- Requires Node.js installation
- Requires terminal access
- Browser dependency
- Manual server management

---

### CLI (Recommended for Automation)
```bash
npm run cli import examples/sample-metrics.json
npm run cli list
npm run cli show METRIC-001
```

**Best for:**
- ✅ Scripting and automation
- ✅ Batch operations
- ✅ CI/CD pipelines
- ✅ Quick queries
- ✅ Administrative tasks

**Advantages:**
- Fastest for single operations
- Perfect for scripts
- No GUI overhead
- Easy to automate
- Ideal for pipelines

**Disadvantages:**
- No visual interface
- Requires command-line knowledge
- Limited features vs dashboard
- Not user-friendly for non-technical users

---

## 🚀 Quick Start Examples

### Example 1: Web Server Setup
```bash
npm install
npm start
# Open http://localhost:3000/dashboard
```

### Example 2: Automation Script
```bash
npm install
npm run cli import my-metrics.json
npm run cli policy METRIC-001 > policy.rego
```

---

## 💡 Recommendations by Use Case

### Personal Use or Team Development
→ **Web Server** - Interactive dashboard

### Production Server
→ **Web Server** - Deploy as service

### CI/CD Integration
→ **CLI** - Automate workflows

### Hybrid Approach
Use both modes:
- Web server for interactive access
- CLI for automation

---

## 📦 Distribution Comparison

| Method | Size | Setup Time | Technical Skill |
|--------|------|------------|-----------------|
| Web Server | 50-100 MB | 5 minutes | ⭐⭐ Intermediate |
| CLI | 50-100 MB | 5 minutes | ⭐⭐⭐ Advanced |

---

## 🎨 Feature Parity

Both methods access the same core functionality:

| Feature | Web | CLI |
|---------|-----|-----|
| View Metrics | ✅ | ✅ |
| Add/Edit/Delete | ✅ | ✅* |
| Import/Export | ✅ | ✅ |
| Domains Management | ✅ | ❌ |
| Objectives Management | ✅ | ❌ |
| API Access | ✅ | ❌ |
| OPA Policy Generation | ✅ | ✅ |
| Dashboard | ✅ | ❌ |

*CLI requires using import/export for modifications

---

## 🔄 Switching Between Modes

You can switch between modes at any time:

```bash
# Run as web server
npm start

# Use CLI
npm run cli list
```

Both modes share the same data store (`.mdl/metrics.json`), so your data is consistent across methods.

---

## 📚 Documentation

- **Web Server**: See `README.md`
- **CLI**: See `USAGE.md`

---

## 🎯 Summary

Choose based on your needs:
- **Want interactive?** → Web Server  
- **Want automated?** → CLI
- **Want both?** → Use them together! They share the same data.

MDL is a versatile metrics management platform! 🎉
