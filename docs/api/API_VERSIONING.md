# API Versioning Strategy - MDL

**Status:** ✅ Implemented  
**Current Version:** v1  
**Last Updated:** November 20, 2025  

---

## Overview

MDL API now uses URL path versioning to ensure backward compatibility and smooth transitions between API versions.

## Versioning Scheme

### URL Structure
```
/api/v{major-version}/{resource}
```

**Examples:**
- `/api/v1/metrics` - Current version
- `/api/v2/metrics` - Future version

### Version Status

| Version | Status | Path Prefix | Support Level |
|---------|--------|-------------|---------------|
| **v1** | ✅ **Current** | `/api/v1/` | Full support (active development) |
| **Legacy** | ⚠️ **Deprecated** | `/api/` | Backward compatibility (6 months) |

---

## v1 Endpoints (Current)

### Core Resources

#### Metrics
- `GET /api/v1/metrics` - List all metrics (with filtering)
- `GET /api/v1/metrics/{id}` - Get metric by ID  
- `POST /api/v1/metrics` - Create new metric (requires Editor role)
- `PUT /api/v1/metrics/{id}` - Update metric (requires Editor role)
- `DELETE /api/v1/metrics/{id}` - Delete metric (requires Admin role)
- `GET /api/v1/metrics/{id}/policy` - Generate OPA policy for metric

#### Policies
- `GET /api/v1/policies` - Generate OPA policies for all metrics

#### Statistics
- `GET /api/v1/stats` - Get aggregate statistics

#### Version Info
- `GET /api/v1/` - API version information and endpoint listing

### Authentication (shared across versions)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/api-keys` - List API keys
- `POST /api/auth/api-keys` - Create API key
- `DELETE /api/auth/api-keys/{id}` - Delete API key

**Note:** Auth endpoints are not versioned as they are shared infrastructure.

---

## Legacy Endpoints (Deprecated)

The following endpoints are maintained for backward compatibility but will be removed after **June 1, 2026**:

- `GET /api/metrics`
- `GET /api/metrics/{id}`
- `POST /api/metrics`
- `PUT /api/metrics/{id}`
- `DELETE /api/metrics/{id}`
- `GET /api/metrics/{id}/policy`
- `GET /api/policies`
- `GET /api/stats`

**Deprecation Warning:** All responses from legacy endpoints include a `X-API-Deprecated` header with sunset date.

---

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require Major Version)
- Removing endpoints
- Removing required fields
- Changing field types (e.g., string → number)
- Changing response structure
- Changing authentication requirements
- Changing HTTP status codes
- Renaming fields

### Non-Breaking Changes (Same Version)
- Adding new endpoints
- Adding optional query parameters
- Adding optional request fields
- Adding response fields
- Adding HTTP headers
- Bug fixes
- Performance improvements
- Documentation updates

---

## Migration Guide

### Migrating from Legacy to v1

**1. Update Base URL:**
```diff
- GET http://localhost:3000/api/metrics
+ GET http://localhost:3000/api/v1/metrics
```

**2. No Schema Changes:**
v1 maintains 100% schema compatibility with legacy endpoints. Only the URL path changes.

**3. Test Your Integration:**
```bash
# Legacy (deprecated)
curl http://localhost:3000/api/metrics

# v1 (current)
curl http://localhost:3000/api/v1/metrics
```

**4. Update Client Code:**
```typescript
// Before
const API_BASE = 'http://localhost:3000/api';

// After
const API_BASE = 'http://localhost:3000/api/v1';
```

---

## API Documentation

### Interactive Documentation
Access Swagger UI at: **http://localhost:3000/api-docs**

### OpenAPI Specification
Available at: `./openapi.yaml`

### Version Discovery
```bash
# Get v1 API information
curl http://localhost:3000/api/v1/

# Response:
{
  "version": "v1",
  "status": "stable",
  "endpoints": {
    "metrics": "/api/v1/metrics",
    "policies": "/api/v1/policies",
    "stats": "/api/v1/stats"
  },
  "documentation": "/api-docs"
}
```

---

## Support Policy

### Current Version (v1)
- **Full Support:** Active development, new features, bug fixes
- **Security Updates:** Immediate patches for security issues
- **Documentation:** Complete and maintained
- **Support Duration:** Until v2 is released + 12 months

### Previous Version (Legacy)
- **Maintenance:** Bug fixes only, no new features
- **Deprecation Period:** 6 months from v1 release (Nov 20, 2025 - May 20, 2026)
- **Sunset Date:** **June 1, 2026**
- **Security Updates:** Critical security patches only

### Deprecated Versions
- **No Support:** No bug fixes, no security updates
- **Recommendation:** Immediate migration to current version

---

## Future Versioning

### v2 (Planned)
Potential v2 features being considered:
- GraphQL endpoint alongside REST
- Enhanced filtering with complex queries
- Pagination with cursor-based navigation
- Webhook support for metric changes
- Batch operations

**Timeline:** TBD (No breaking changes planned yet)

---

## Implementation Details

### Code Structure
```
src/api/
├── routes/
│   └── v1/
│       ├── index.ts       # v1 router
│       ├── metrics.ts     # Metrics endpoints
│       ├── policies.ts    # Policies endpoints
│       └── stats.ts       # Statistics endpoints
├── server.ts              # Main server (mounts v1 + legacy)
└── auth.ts                # Auth router (shared)
```

### Server Configuration
```typescript
// v1 API (versioned)
app.use('/api/v1', createV1Router(getStore));

// Legacy API (backward compatibility)
app.use('/api/metrics', legacyMetricsRouter);
app.use('/api/policies', legacyPoliciesRouter);
app.use('/api/stats', legacyStatsRouter);

// Auth (shared, not versioned)
app.use('/api/auth', createAuthRouter(userStore));
```

---

## Testing

### Integration Tests
All integration tests updated to use v1 endpoints:
- ✅ Auth API: 17/17 tests (shared endpoints)
- ✅ Metrics API: 20/20 tests (v1 endpoints)
- ⚡ Total: 37/37 tests passing

### Testing Both Versions
```bash
# Test v1 (current)
npm test -- tests/integration/metrics.test.ts

# Legacy tests (if needed)
npm test -- tests/integration/legacy-metrics.test.ts
```

---

## Changelog

### v1.0.0 (November 20, 2025)
- ✅ Initial v1 release
- ✅ URL path versioning implemented
- ✅ Swagger UI documentation hosted
- ✅ Legacy endpoints marked deprecated
- ✅ Migration guide published
- ✅ All integration tests updated

---

## FAQs

**Q: Why version the API?**  
A: Versioning allows us to make improvements without breaking existing integrations.

**Q: How long will legacy endpoints work?**  
A: Until June 1, 2026 (6 months deprecation period).

**Q: Will v1 endpoints change?**  
A: No breaking changes. Only additions and bug fixes.

**Q: When will v2 be released?**  
A: No v2 planned yet. v1 is stable and meets all current needs.

**Q: How do I know which version I'm using?**  
A: Check the URL path: `/api/v1/` is v1, `/api/` is legacy.

---

## Resources

- **Swagger UI:** http://localhost:3000/api-docs
- **OpenAPI Spec:** `./openapi.yaml`
- **Integration Tests:** `tests/integration/`
- **Phase 2B Plan:** `PHASE_2B_API.md`

---

**Status:** ✅ API versioning fully implemented and tested  
**Next Steps:** Client SDK generation, additional API versions as needed
