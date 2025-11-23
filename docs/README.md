# MDL Documentation Index

This directory contains organized documentation for the Metrics Definition Library project.

## 📁 Directory Structure

### `/authentication/`
Authentication and authorization documentation:
- `API_AUTHENTICATION.md` - API endpoint authentication requirements
- `AUTH_QUICKREF.md` - Quick reference for authentication setup
- `AUTH_TEST_RESULTS.md` - Authentication testing results
- `AUTHENTICATION_DOCUMENTATION_UPDATES.md` - Authentication doc update history

**Main Guide:** See [`/AUTHENTICATION.md`](../AUTHENTICATION.md) in root for complete authentication documentation.

### `/api/`
API documentation and tools:
- `API_VERSIONING.md` - API versioning strategy and migration guide
- `INSOMNIA.md` - Insomnia REST client setup guide
- `insomnia-collection.json` - Insomnia collection for API testing

**Main Guide:** See [`/openapi.yaml`](../openapi.yaml) for OpenAPI 3.0 specification and http://localhost:3000/api-docs for Swagger UI.

### `/testing/`
Testing documentation and results:
- `E2E_TESTING_PLAN.md` - End-to-end testing plan (for future frontend)
- `E2E_STATUS.md` - E2E testing status
- `E2E_SESSION_SUMMARY.md` - E2E testing session summary
- `CACHE_TESTING.md` - Cache implementation testing results

**Main Guide:** See test coverage reports in [`/coverage/`](../coverage/) directory.

### `/phases/`
Phase-specific implementation documentation:
- `PHASE_1_CRITICAL.md` - Phase 1: Critical foundations
- `PHASE_2A_TESTING.md` - Phase 2A: Testing implementation plan
- `PHASE_2A_PROGRESS.md` - Phase 2A: Progress tracking
- `PHASE_2B_API.md` - Phase 2B: API documentation implementation
- `PHASE_2B_COMPLETION.md` - Phase 2B: Completion summary
- `PHASE_2C_PERFORMANCE.md` - Phase 2C: Performance & scalability implementation
- `PHASE_2D_MONITORING.md` - Phase 2D: Monitoring & observability implementation
- `PHASE_2D_COMPLETION.md` - Phase 2D: Completion summary
- `PHASE_2_CONSOLIDATION_SUMMARY.md` - Phase 2: Documentation consolidation summary

**Main Guides:** 
- [`/PHASE_2_MAJOR.md`](../PHASE_2_MAJOR.md) - Overall Phase 2 status
- [`/PHASE_2_COMPLETION_SUMMARY.md`](../PHASE_2_COMPLETION_SUMMARY.md) - Complete Phase 2 summary
- [`/PHASE_3_MINOR.md`](../PHASE_3_MINOR.md) - Phase 3 plan
- [`/PHASE_4_HARDENING.md`](../PHASE_4_HARDENING.md) - Phase 4 plan

### `/completed/`
Archived documentation for completed tasks:
- `TASK_1_COMPLETE.md` - Phase 2C Task 1: Redis caching implementation
- `TASK_2_COMPLETE.md` - Phase 2D Task 2: Alerting configuration
- `TASK_3_COMPLETE.md` - Phase 2D Task 3: Distributed tracing
- `TASK_4_COMPLETE.md` - Phase 2D Task 4: Grafana dashboards
- `TASK_5_COMPLETE.md` - Phase 2D Task 5: Log aggregation (optional)

---

## 📚 Key Documentation (Root Level)

### Getting Started
- [`README.md`](../README.md) - Main project documentation and quick start guide
- [`AUTHENTICATION.md`](../AUTHENTICATION.md) - Complete authentication system guide
- [`CHANGELOG.md`](../CHANGELOG.md) - Project change history

### Planning & Status
- [`PHASE_2_MAJOR.md`](../PHASE_2_MAJOR.md) - Phase 2 overall status and plan
- [`PHASE_2_COMPLETION_SUMMARY.md`](../PHASE_2_COMPLETION_SUMMARY.md) - Phase 2 comprehensive summary
- [`PHASE_3_MINOR.md`](../PHASE_3_MINOR.md) - Phase 3: Minor improvements plan
- [`PHASE_4_HARDENING.md`](../PHASE_4_HARDENING.md) - Phase 4: Production hardening plan
- [`GAPS_AND_IMPROVEMENTS.md`](../GAPS_AND_IMPROVEMENTS.md) - Gap analysis and recommendations
- [`OPTIONAL_INFRASTRUCTURE.md`](../OPTIONAL_INFRASTRUCTURE.md) - Optional infrastructure components

### API & Integration
- [`openapi.yaml`](../openapi.yaml) - OpenAPI 3.0 API specification
- http://localhost:3000/api-docs - Interactive Swagger UI (when server running)

### Monitoring
- [`monitoring/README.md`](../monitoring/README.md) - Monitoring setup and usage guide
- [`monitoring/METRICS_REFERENCE.md`](../monitoring/METRICS_REFERENCE.md) - Metrics documentation
- [`monitoring/ALERTING_GUIDE.md`](../monitoring/ALERTING_GUIDE.md) - Alerting configuration
- [`monitoring/DASHBOARDS_GUIDE.md`](../monitoring/DASHBOARDS_GUIDE.md) - Dashboard usage
- [`monitoring/TRACING_GUIDE.md`](../monitoring/TRACING_GUIDE.md) - Distributed tracing guide
- [`monitoring/runbooks/`](../monitoring/runbooks/) - Operational runbooks (10 runbooks)

---

## 🔍 Quick Links by Topic

### Authentication & Security
- Main: [`/AUTHENTICATION.md`](../AUTHENTICATION.md)
- API Requirements: [`/docs/authentication/API_AUTHENTICATION.md`](./authentication/API_AUTHENTICATION.md)
- Quick Reference: [`/docs/authentication/AUTH_QUICKREF.md`](./authentication/AUTH_QUICKREF.md)

### API Documentation
- OpenAPI Spec: [`/openapi.yaml`](../openapi.yaml)
- Versioning Strategy: [`/docs/api/API_VERSIONING.md`](./api/API_VERSIONING.md)
- Swagger UI: http://localhost:3000/api-docs

### Testing
- Unit & Integration: [`/README.md#testing`](../README.md#testing)
- E2E Plan: [`/docs/testing/E2E_TESTING_PLAN.md`](./testing/E2E_TESTING_PLAN.md)
- Coverage Reports: [`/coverage/`](../coverage/)

### Performance & Monitoring
- Performance: [`/docs/phases/PHASE_2C_PERFORMANCE.md`](./phases/PHASE_2C_PERFORMANCE.md)
- Monitoring Setup: [`/monitoring/README.md`](../monitoring/README.md)
- Runbooks: [`/monitoring/runbooks/`](../monitoring/runbooks/)

### Project Status
- Current Status: [`/PHASE_2_COMPLETION_SUMMARY.md`](../PHASE_2_COMPLETION_SUMMARY.md)
- Gaps Analysis: [`/GAPS_AND_IMPROVEMENTS.md`](../GAPS_AND_IMPROVEMENTS.md)
- Change History: [`/CHANGELOG.md`](../CHANGELOG.md)

---

## 📝 Documentation Standards

When creating or updating documentation:

1. **Location**: Place in appropriate subdirectory based on topic
2. **Naming**: Use clear, descriptive names with UPPERCASE for markdown files
3. **Cross-references**: Use relative links to reference other documents
4. **Status**: Include status badges (✅, 🟡, ❌) for tracking
5. **Dates**: Include last updated date in document header
6. **Audience**: Specify target audience (developers, operators, users)

---

**Last Updated:** November 23, 2025  
**Documentation Version:** 2.0.0
