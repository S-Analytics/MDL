# MDL - Usage Options Comparison

MDL can now be used in three different ways. Choose the option that best fits your needs:

## 📊 Comparison Chart

| Feature | Desktop App | Web Server | CLI |
|---------|-------------|------------|-----|
| **User Experience** | Native desktop window | Browser-based | Command-line |
| **Installation** | Download + Install | `npm install` | `npm install` |
| **Requires Node.js** | ❌ No | ✅ Yes | ✅ Yes |
| **Requires Terminal** | ❌ No | ✅ Yes | ✅ Yes |
| **Auto-starts Server** | ✅ Yes | ❌ No | ❌ No |
| **Dashboard UI** | ✅ Yes | ✅ Yes | ❌ No |
| **Keyboard Shortcuts** | ✅ Yes | Limited | N/A |
| **Menu Bar** | ✅ Yes | ❌ No | N/A |
| **Runs Offline** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Cross-Platform** | ✅ Yes | ✅ Yes | ✅ Yes |
| **API Access** | ✅ Yes | ✅ Yes | ❌ No |
| **Best For** | End users | Developers | Automation |

## 🎯 When to Use Each Option

### Desktop App (Recommended for End Users)
```bash
npm run electron:dev        # Development
npm run electron:build      # Production installer
```

**Best for:**
- ✅ End users who want a simple installation
- ✅ Teams who don't have Node.js installed
- ✅ Users who prefer native desktop apps
- ✅ Scenarios requiring offline access
- ✅ Distribution to non-technical users

**Advantages:**
- No technical setup required
- Double-click to run
- Feels like a native application
- System integration (menu, shortcuts)
- Auto-updates possible (with setup)

**Disadvantages:**
- Larger download size (~150-200 MB)
- Requires building installers
- Updates require new installer (without auto-update)

---

### Web Server (Recommended for Developers)
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
- Lightweight (no Electron overhead)
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

### Example 1: End User Setup
```bash
# Download MDL-1.0.0.dmg (macOS) or MDL Setup 1.0.0.exe (Windows)
# Install like any other application
# Double-click to run
# ✅ Done! Dashboard opens automatically
```

### Example 2: Developer Setup
```bash
npm install
npm start
# Open http://localhost:3000/dashboard
```

### Example 3: Automation Script
```bash
npm install
npm run cli import my-metrics.json
npm run cli policy METRIC-001 > policy.rego
```

---

## 💡 Recommendations by Use Case

### Personal Use or Small Team
→ **Desktop App** - Easiest to use

### Development Team
→ **Web Server** - Best for iteration

### Production Server
→ **Web Server** - Deploy as service

### CI/CD Integration
→ **CLI** - Automate workflows

### Large Organization
→ **Desktop App** - Distribute to users
→ **Web Server** - Centralized instance

### Hybrid Approach
Use multiple modes:
- Desktop app for analysts
- Web server for shared access
- CLI for automation

---

## 📦 Distribution Comparison

| Method | Size | Setup Time | Technical Skill |
|--------|------|------------|-----------------|
| Desktop Installer | 150-200 MB | 2 minutes | ⭐ Beginner |
| Web Server | 50-100 MB | 5 minutes | ⭐⭐ Intermediate |
| CLI | 50-100 MB | 5 minutes | ⭐⭐⭐ Advanced |

---

## 🎨 Feature Parity

All three methods access the same core functionality:

| Feature | Desktop | Web | CLI |
|---------|---------|-----|-----|
| View Metrics | ✅ | ✅ | ✅ |
| Add/Edit/Delete | ✅ | ✅ | ✅* |
| Import/Export | ✅ | ✅ | ✅ |
| Domains Management | ✅ | ✅ | ❌ |
| Objectives Management | ✅ | ✅ | ❌ |
| API Access | ✅ | ✅ | ❌ |
| OPA Policy Generation | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ❌ |

*CLI requires using import/export for modifications

---

## 🔄 Switching Between Modes

You can switch between modes at any time:

```bash
# Run as desktop app
npm run electron:dev

# Run as web server
npm start

# Use CLI
npm run cli list
```

All modes share the same data store (`.mdl/metrics.json`), so your data is consistent across all methods.

---

## 📚 Documentation

- **Desktop App**: See `QUICKSTART_ELECTRON.md`
- **Web Server**: See `README.md`
- **CLI**: See `USAGE.md`
- **Complete Guide**: See `ELECTRON.md`

---

## 🎯 Summary

Choose based on your needs:
- **Want easy?** → Desktop App
- **Want flexible?** → Web Server  
- **Want automated?** → CLI
- **Want all?** → Use all three! They work together.

MDL is now the most versatile metrics management platform! 🎉
