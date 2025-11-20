# Phase 2B: API Documentation & Versioning - Implementation Plan

**Duration:** 3-4 weeks  
**Priority:** P1 - Important for developer experience  
**Part of:** Phase 2 Major Improvements  
**Last Updated:** November 20, 2025  
**Status:** 🟡 PARTIAL - OpenAPI exists, versioning and hosting needed

---

## Overview

Professional API documentation and versioning are essential for maintaining backward compatibility, supporting integrations, and providing excellent developer experience. This phase establishes API versioning strategy, enhances OpenAPI documentation, and creates tools for API consumers.

**Current State:**
- ✅ OpenAPI spec exists (openapi.yaml)
- ✅ Comprehensive endpoint documentation
- ✅ Insomnia collection available
- ✅ **Phase 2A Testing Complete**: 37/37 integration tests validate API contracts 🎉
- ✅ **Unit Testing**: 88.53% coverage ensures API stability
- ⚠️ No API versioning strategy (endpoints at /api/)
- ❌ Documentation not hosted (no Swagger UI)
- ❌ No client SDKs
- ❌ No deprecation policy
- ✅ Request/response validation in place

**Target State:**
- API versioned (/api/v1/, /api/v2/)
- OpenAPI spec auto-validated
- Swagger UI hosted
- Client SDKs generated
- Clear deprecation policy

---

## Task 1: API Versioning Strategy (Week 1)

### 1.1: Design Versioning Strategy

**Duration:** 2 days

**Steps:**
1. Define versioning approach:
```markdown
# API Versioning Strategy

## Versioning Scheme
- URL path versioning: `/api/v1/`, `/api/v2/`
- Major version in URL
- Minor/patch versions via headers (optional)

## Version Lifecycle
- **Current (v1)**: Fully supported, receives bug fixes
- **Next (v2)**: Beta, may have breaking changes
- **Legacy (v0)**: Deprecated, minimal support, sunset date announced

## Breaking Changes
Breaking changes require major version bump:
- Removing endpoints
- Removing required fields
- Changing field types
- Changing authentication
- Changing response structure

## Non-Breaking Changes
Can be released in current version:
- Adding endpoints
- Adding optional fields
- Adding response fields
- Bug fixes
- Performance improvements

## Support Policy
- Current version: Full support
- Previous version: 12 months maintenance
- Older versions: No support

## Migration Path
- 6 months notice for deprecation
- Migration guide provided
- Dual running period (6 months)
- Automated migration tools when possible
```

**Acceptance Criteria:**
- [ ] Versioning strategy documented
- [ ] Breaking vs non-breaking changes defined
- [ ] Support policy established
- [ ] Stakeholders approved

---

### 1.2: Implement API Versioning Infrastructure

**Duration:** 3-4 days

**Steps:**
1. Create version router:
```typescript
// src/api/routes/index.ts
import { Router } from 'express';
import v1Routes from './v1';
import v2Routes from './v2';

export function createRouter() {
  const router = Router();
  
  // Version 1 (current stable)
  router.use('/v1', v1Routes);
  
  // Version 2 (beta)
  router.use('/v2', v2Routes);
  
  // Default to v1 (not recommended for clients)
  router.use('/', v1Routes);
  
  return router;
}
```

2. Organize v1 routes:
```typescript
// src/api/routes/v1/index.ts
import { Router } from 'express';
import { authenticate } from '../../../auth/middleware';
import metricsRoutes from './metrics';
import domainsRoutes from './domains';
import objectivesRoutes from './objectives';
import policiesRoutes from './policies';
import statsRoutes from './stats';

const router = Router();

router.use('/metrics', authenticate, metricsRoutes);
router.use('/domains', authenticate, domainsRoutes);
router.use('/objectives', authenticate, objectivesRoutes);
router.use('/policies', authenticate, policiesRoutes);
router.use('/stats', authenticate, statsRoutes);

export default router;
```

3. Update server.ts:
```typescript
// src/api/server.ts
import { createRouter } from './routes';

const apiRouter = createRouter();
app.use('/api', apiRouter);
```

**Acceptance Criteria:**
- [ ] Version routing implemented
- [ ] /api/v1/ endpoints working
- [ ] /api/v2/ structure ready
- [ ] Legacy /api/ routes still work (temporarily)
- [ ] Version info in response headers

---

### 1.3: Add API Version Metadata

**Duration:** 1 day

**Steps:**
1. Create version middleware:
```typescript
// src/api/middleware/version.ts
export function apiVersion(version: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Deprecated', 'false');
    next();
  };
}

export function deprecatedApi(sunsetDate: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Sunset', sunsetDate);
    res.setHeader('X-API-Deprecation-Info', 'https://docs.mdl.com/api/migration');
    
    logger.warn('Deprecated API accessed', {
      endpoint: req.path,
      version: req.baseUrl,
      userAgent: req.get('user-agent')
    });
    
    next();
  };
}
```

2. Apply to routes:
```typescript
// In v1 routes
router.use(apiVersion('1.0'));

// For deprecated v0 routes (if any)
router.use(deprecatedApi('2026-06-01'));
```

**Acceptance Criteria:**
- [ ] API version in response headers
- [ ] Deprecation warnings for old versions
- [ ] Sunset date communicated
- [ ] Usage of deprecated APIs logged

---

## Task 2: OpenAPI Specification Enhancement (Week 2)

### 2.1: Update OpenAPI Specification

**Duration:** 3-4 days

**Steps:**
1. Enhance openapi.yaml:
```yaml
openapi: 3.0.3
info:
  title: Metrics Definition Library API
  version: 2.0.0
  description: |
    The MDL API provides comprehensive metric management capabilities including
    versioning, change tracking, and OPA policy generation.
    
    ## Authentication
    All endpoints require Bearer token authentication. Obtain a token via
    POST /api/auth/login.
    
    ## Versioning
    The API uses URL path versioning. Current version: v1
    - Stable: `/api/v1/`
    - Beta: `/api/v2/`
    
    ## Rate Limiting
    - General endpoints: 100 requests per 15 minutes
    - Authentication: 5 attempts per 15 minutes
    
  contact:
    name: MDL Support
    email: support@mdl.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000/api/v1
    description: Development server (v1)
  - url: https://api.mdl.com/v1
    description: Production server (v1)
  - url: http://localhost:3000/api/v2
    description: Development server (v2 - Beta)

tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Metrics
    description: Metric definition management
  - name: Domains
    description: Business domain management
  - name: Objectives
    description: Objective management
  - name: Policies
    description: OPA policy generation
  - name: Statistics
    description: System statistics

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: ERR_2001
            message:
              type: string
              example: Validation failed
            details:
              type: object
            requestId:
              type: string
              format: uuid
    
    MetricDefinition:
      type: object
      required:
        - metric_id
        - name
        - description
        - category
        - metric_type
        - tier
        - unit_of_measure
      properties:
        metric_id:
          type: string
          pattern: ^METRIC-[A-Z0-9-]+$
          example: METRIC-001
          description: Unique metric identifier
        name:
          type: string
          minLength: 3
          maxLength: 200
          example: Customer Satisfaction Score
        description:
          type: string
          minLength: 10
          maxLength: 2000
          example: Measures customer satisfaction based on survey responses
        version:
          type: string
          pattern: ^\d+\.\d+\.\d+$
          example: 1.0.0
          description: Semantic version
        # ... (rest of fields)
      example:
        metric_id: METRIC-001
        name: Customer Satisfaction Score
        description: Measures customer satisfaction based on survey responses
        category: operational
        metric_type: quantitative
        tier: tier1
        unit_of_measure: percentage
        version: 1.0.0

security:
  - bearerAuth: []

paths:
  /auth/login:
    post:
      tags:
        - Authentication
      summary: User login
      description: Authenticate user and receive JWT token
      operationId: login
      security: []  # No auth required for login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  example: admin
                password:
                  type: string
                  format: password
                  example: Admin123!
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  access_token:
                    type: string
                  refresh_token:
                    type: string
                  expires_in:
                    type: integer
                  token_type:
                    type: string
                    example: Bearer
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /metrics:
    get:
      tags:
        - Metrics
      summary: List all metrics
      description: Retrieve all metrics with optional filtering
      operationId: listMetrics
      parameters:
        - name: category
          in: query
          schema:
            type: string
            enum: [operational, strategic, tactical, leading, lagging]
        - name: tier
          in: query
          schema:
            type: string
            enum: [tier1, tier2, tier3]
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: true
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/MetricDefinition'
                  pagination:
                    type: object
                    properties:
                      page:
                        type: integer
                      limit:
                        type: integer
                      total:
                        type: integer
                      pages:
                        type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
    
    post:
      tags:
        - Metrics
      summary: Create new metric
      operationId: createMetric
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MetricDefinition'
      responses:
        '201':
          description: Metric created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MetricDefinition'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
  
  /metrics/{metricId}:
    parameters:
      - name: metricId
        in: path
        required: true
        schema:
          type: string
          pattern: ^METRIC-[A-Z0-9-]+$
    
    get:
      tags:
        - Metrics
      summary: Get metric by ID
      operationId: getMetric
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MetricDefinition'
        '404':
          $ref: '#/components/responses/NotFound'
    
    put:
      tags:
        - Metrics
      summary: Update metric
      operationId: updateMetric
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MetricDefinition'
      responses:
        '200':
          description: Metric updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MetricDefinition'
        '404':
          $ref: '#/components/responses/NotFound'
    
    delete:
      tags:
        - Metrics
      summary: Delete metric
      operationId: deleteMetric
      responses:
        '204':
          description: Metric deleted
        '404':
          $ref: '#/components/responses/NotFound'

# ... (more endpoints)

components:
  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: ERR_1001
              message: Authentication required
    
    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: ERR_2001
              message: Validation failed
              details:
                errors:
                  - field: name
                    message: must be at least 3 characters
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: ERR_3001
              message: Metric not found
```

**Acceptance Criteria:**
- [ ] All endpoints documented
- [ ] Request/response schemas complete
- [ ] Examples provided for all operations
- [ ] Authentication documented
- [ ] Error responses documented
- [ ] Query parameters documented

---

### 2.2: Validate OpenAPI Spec Against Code

**Duration:** 2 days

**Steps:**
1. Install validation tools:
```bash
npm install --save-dev swagger-cli @apidevtools/swagger-parser
```

2. Create validation script:
```typescript
// scripts/validate-openapi.ts
import SwaggerParser from '@apidevtools/swagger-parser';
import { createApp } from '../src/api/server';
import { logger } from '../src/utils/logger';

async function validateOpenAPI() {
  try {
    // Parse and validate OpenAPI spec
    const api = await SwaggerParser.validate('./openapi.yaml');
    logger.info('OpenAPI spec is valid', { version: api.info.version });
    
    // Extract all endpoints from spec
    const specEndpoints = new Set<string>();
    for (const [path, methods] of Object.entries(api.paths)) {
      for (const method of Object.keys(methods)) {
        if (method !== 'parameters') {
          specEndpoints.add(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    
    // TODO: Extract actual endpoints from Express app and compare
    
    logger.info('OpenAPI validation complete', {
      specEndpoints: specEndpoints.size
    });
    
    return true;
  } catch (error) {
    logger.error('OpenAPI validation failed', { error });
    process.exit(1);
  }
}

validateOpenAPI();
```

3. Add to package.json:
```json
{
  "scripts": {
    "validate:api": "ts-node scripts/validate-openapi.ts"
  }
}
```

**Acceptance Criteria:**
- [ ] OpenAPI spec validates successfully
- [ ] Validation script created
- [ ] Can detect missing endpoints
- [ ] Runs in CI/CD pipeline

---

## Task 3: API Documentation Hosting (Week 2-3)

### 3.1: Set Up Swagger UI

**Duration:** 2 days

**Steps:**
1. Install Swagger UI:
```bash
npm install swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

2. Configure Swagger UI:
```typescript
// src/api/docs.ts
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { Express } from 'express';

export function setupAPIDocs(app: Express) {
  const swaggerDocument = YAML.load('./openapi.yaml');
  
  const options = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MDL API Documentation',
    customfavIcon: '/assets/favicon.ico'
  };
  
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerDocument, options));
  
  // Serve raw OpenAPI spec
  app.get('/api/openapi.yaml', (req, res) => {
    res.sendFile('openapi.yaml', { root: '.' });
  });
  
  app.get('/api/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });
}
```

3. Apply in server.ts:
```typescript
// src/api/server.ts
import { setupAPIDocs } from './docs';

setupAPIDocs(app);
```

**Acceptance Criteria:**
- [ ] Swagger UI accessible at /api/docs
- [ ] All endpoints visible
- [ ] Try-it-out functionality works
- [ ] Authentication can be configured in UI
- [ ] OpenAPI spec downloadable

---

### 3.2: Create API Documentation Website

**Duration:** 3-4 days

**Steps:**
1. Set up documentation site (using GitHub Pages or similar):
```markdown
# docs/index.md
# MDL API Documentation

## Getting Started

### Authentication
All API requests require authentication using JWT Bearer tokens.

1. Register a user:
\`\`\`bash
curl -X POST https://api.mdl.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "email": "your-email@example.com",
    "password": "YourSecurePassword123!"
  }'
\`\`\`

2. Login to get token:
\`\`\`bash
curl -X POST https://api.mdl.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "YourSecurePassword123!"
  }'
\`\`\`

3. Use token in requests:
\`\`\`bash
curl -X GET https://api.mdl.com/v1/metrics \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
\`\`\`

## Quick Examples

### Create a Metric
\`\`\`javascript
const response = await fetch('https://api.mdl.com/v1/metrics', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    metric_id: 'METRIC-001',
    name: 'Customer Satisfaction',
    description: 'Measures customer satisfaction from surveys',
    category: 'operational',
    metric_type: 'quantitative',
    tier: 'tier1',
    unit_of_measure: 'percentage',
    owner: 'customer-success-team'
  })
});

const metric = await response.json();
console.log(metric);
\`\`\`

## API Reference

[View Interactive API Docs →](https://api.mdl.com/api/docs)

## SDKs

- [TypeScript/JavaScript SDK](./sdks/typescript.md)
- [Python SDK](./sdks/python.md)

## Migration Guides

- [Migrating from v0 to v1](./migration/v0-to-v1.md)
```

2. Add code examples for each language:
```markdown
# docs/examples/typescript.md
# TypeScript Examples

## Installation
\`\`\`bash
npm install @mdl/client
\`\`\`

## Usage
\`\`\`typescript
import { MDLClient } from '@mdl/client';

const client = new MDLClient({
  baseURL: 'https://api.mdl.com',
  apiKey: 'your-api-key'
});

// List metrics
const metrics = await client.metrics.list({
  category: 'operational',
  page: 1,
  limit: 50
});

// Get metric
const metric = await client.metrics.get('METRIC-001');

// Create metric
const newMetric = await client.metrics.create({
  metric_id: 'METRIC-002',
  name: 'Revenue Growth',
  // ...
});

// Update metric
const updated = await client.metrics.update('METRIC-002', {
  description: 'Updated description'
});

// Delete metric
await client.metrics.delete('METRIC-002');
\`\`\`
```

**Acceptance Criteria:**
- [ ] Documentation website created
- [ ] Getting started guide complete
- [ ] Code examples for common operations
- [ ] Examples in multiple languages
- [ ] Migration guides published
- [ ] Documentation searchable

---

## Task 4: Client SDK Generation (Week 3-4)

### 4.1: Generate TypeScript SDK

**Duration:** 3-4 days

**Steps:**
1. Install OpenAPI Generator:
```bash
npm install --save-dev @openapitools/openapi-generator-cli
```

2. Configure SDK generation:
```yaml
# openapi-generator-config.yaml
generatorName: typescript-axios
inputSpec: ./openapi.yaml
outputDir: ./sdks/typescript
additionalProperties:
  npmName: "@mdl/client"
  npmVersion: "1.0.0"
  supportsES6: true
  withInterfaces: true
  useSingleRequestParameter: true
```

3. Create generation script:
```json
// package.json
{
  "scripts": {
    "generate:sdk": "openapi-generator-cli generate -c openapi-generator-config.yaml",
    "build:sdk": "cd sdks/typescript && npm run build"
  }
}
```

4. Customize generated SDK:
```typescript
// sdks/typescript/src/client.ts
import { Configuration, MetricsApi, AuthenticationApi } from './generated';

export class MDLClient {
  private readonly config: Configuration;
  public readonly metrics: MetricsApi;
  public readonly auth: AuthenticationApi;
  
  constructor(options: { baseURL: string; apiKey?: string; token?: string }) {
    this.config = new Configuration({
      basePath: options.baseURL,
      accessToken: options.token || options.apiKey
    });
    
    this.metrics = new MetricsApi(this.config);
    this.auth = new AuthenticationApi(this.config);
  }
  
  async login(username: string, password: string): Promise<string> {
    const response = await this.auth.login({ username, password });
    this.config.accessToken = response.data.access_token;
    return response.data.access_token;
  }
}
```

**Acceptance Criteria:**
- [ ] TypeScript SDK generated from OpenAPI spec
- [ ] SDK includes all API operations
- [ ] Type definitions included
- [ ] SDK published to npm
- [ ] SDK documentation included
- [ ] Examples provided

---

### 4.2: Generate Python SDK

**Duration:** 3-4 days

**Steps:**
1. Configure Python SDK generation:
```yaml
# openapi-generator-config-python.yaml
generatorName: python
inputSpec: ./openapi.yaml
outputDir: ./sdks/python
additionalProperties:
  packageName: "mdl_client"
  packageVersion: "1.0.0"
  projectName: "mdl-client"
```

2. Generate SDK:
```bash
openapi-generator-cli generate -c openapi-generator-config-python.yaml
```

3. Customize client:
```python
# sdks/python/mdl_client/client.py
from mdl_client.api import MetricsApi, AuthenticationApi
from mdl_client.configuration import Configuration

class MDLClient:
    def __init__(self, base_url: str, api_key: str = None, token: str = None):
        self.config = Configuration(
            host=base_url,
            access_token=token or api_key
        )
        
        self.metrics = MetricsApi(self.config)
        self.auth = AuthenticationApi(self.config)
    
    def login(self, username: str, password: str) -> str:
        response = self.auth.login(username=username, password=password)
        self.config.access_token = response.access_token
        return response.access_token
```

4. Add setup.py:
```python
# sdks/python/setup.py
from setuptools import setup, find_packages

setup(
    name="mdl-client",
    version="1.0.0",
    description="Python client for MDL API",
    author="MDL Team",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
        "python-dateutil>=2.8.0"
    ],
    python_requires=">=3.7"
)
```

**Acceptance Criteria:**
- [ ] Python SDK generated
- [ ] SDK includes all API operations
- [ ] Type hints included
- [ ] Published to PyPI
- [ ] Documentation included
- [ ] Examples provided

---

## Task 5: Deprecation Policy & Migration Tools (Week 4)

### 5.1: Implement Deprecation Warnings

**Duration:** 2 days

**Steps:**
1. Create deprecation decorator:
```typescript
// src/api/middleware/deprecation.ts
export interface DeprecationInfo {
  endpoint: string;
  deprecatedSince: string;
  sunsetDate: string;
  alternative: string;
  migrationGuide: string;
}

export function deprecated(info: DeprecationInfo) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log deprecation
    logger.warn('Deprecated endpoint accessed', {
      endpoint: info.endpoint,
      requestId: (req as any).requestId,
      userAgent: req.get('user-agent')
    });
    
    // Set headers
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecation-Date', info.deprecatedSince);
    res.setHeader('X-API-Sunset-Date', info.sunsetDate);
    res.setHeader('X-API-Alternative', info.alternative);
    res.setHeader('Link', `<${info.migrationGuide}>; rel="deprecation"`);
    
    // Add warning to response
    if (!res.locals.warnings) {
      res.locals.warnings = [];
    }
    res.locals.warnings.push({
      code: 'DEPRECATION',
      message: `This endpoint is deprecated and will be removed on ${info.sunsetDate}`,
      alternative: info.alternative
    });
    
    next();
  };
}
```

2. Apply to deprecated endpoints:
```typescript
// Example: Deprecate old import endpoint
router.post('/import', deprecated({
  endpoint: 'POST /api/import',
  deprecatedSince: '2025-06-01',
  sunsetDate: '2026-06-01',
  alternative: 'POST /api/v1/metrics/import',
  migrationGuide: 'https://docs.mdl.com/migration/import-endpoint'
}), importHandler);
```

**Acceptance Criteria:**
- [ ] Deprecation decorator created
- [ ] Headers set for deprecated endpoints
- [ ] Warnings included in responses
- [ ] Usage logged for tracking
- [ ] Migration guides linked

---

### 5.2: Create Migration Guide

**Duration:** 2-3 days

**Steps:**
```markdown
# docs/migration/v0-to-v1.md
# Migrating from v0 to v1

## Overview
API v1 introduces several improvements including:
- Enhanced authentication with JWT
- Standardized error responses
- Semantic versioning for metrics
- Better filtering and pagination

## Breaking Changes

### 1. Authentication
**v0:** No authentication required
\`\`\`bash
curl https://api.mdl.com/metrics
\`\`\`

**v1:** Requires Bearer token
\`\`\`bash
# Get token
TOKEN=$(curl -X POST https://api.mdl.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' \
  | jq -r '.access_token')

# Use token
curl https://api.mdl.com/v1/metrics \
  -H "Authorization: Bearer $TOKEN"
\`\`\`

### 2. Error Response Format
**v0:**
\`\`\`json
{
  "error": "Metric not found"
}
\`\`\`

**v1:**
\`\`\`json
{
  "error": {
    "code": "ERR_3001",
    "message": "Metric not found",
    "requestId": "req-123-456"
  }
}
\`\`\`

### 3. Pagination
**v0:** Returns all results
\`\`\`bash
GET /metrics
\`\`\`

**v1:** Paginated by default
\`\`\`bash
GET /v1/metrics?page=1&limit=50
\`\`\`

Response includes pagination metadata:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
\`\`\`

## Migration Steps

### Step 1: Update Authentication
1. Register users in new system
2. Update clients to obtain JWT tokens
3. Include tokens in all requests

### Step 2: Update Error Handling
1. Parse new error format
2. Handle error codes
3. Use requestId for support

### Step 3: Handle Pagination
1. Add pagination parameters
2. Handle paginated responses
3. Implement page navigation

### Step 4: Test Migration
1. Run tests against v1 endpoints
2. Verify all operations work
3. Monitor for errors

## Migration Tools

### Automated Migration Script
\`\`\`bash
# Download migration script
curl -O https://docs.mdl.com/scripts/migrate-v0-to-v1.sh
chmod +x migrate-v0-to-v1.sh

# Run migration
./migrate-v0-to-v1.sh --from v0 --to v1 --api-key YOUR_API_KEY
\`\`\`

## Support
- Migration deadline: June 1, 2026
- Support: support@mdl.com
- Documentation: https://docs.mdl.com
```

**Acceptance Criteria:**
- [ ] Migration guide complete
- [ ] All breaking changes documented
- [ ] Step-by-step instructions provided
- [ ] Code examples included
- [ ] Migration tools provided

---

## Phase 2B Completion Checklist

### API Versioning ✅
- [ ] Versioning strategy documented
- [ ] URL path versioning implemented (/api/v1/)
- [ ] Version metadata in headers
- [ ] Deprecation system working
- [ ] Support policy established

### OpenAPI Specification ✅
- [ ] OpenAPI spec updated and complete
- [ ] All endpoints documented
- [ ] Request/response examples provided
- [ ] Validation script created
- [ ] Spec validated against code

### Documentation Hosting ✅
- [ ] Swagger UI hosted at /api/docs
- [ ] Documentation website created
- [ ] Getting started guide complete
- [ ] Code examples in multiple languages
- [ ] Documentation searchable

### Client SDKs ✅
- [ ] TypeScript SDK generated
- [ ] Python SDK generated
- [ ] SDKs published (npm, PyPI)
- [ ] SDK documentation complete
- [ ] Examples provided

### Migration Support ✅
- [ ] Deprecation warnings implemented
- [ ] Migration guides published
- [ ] Migration tools provided
- [ ] Timeline communicated (12 months)

---

## Success Metrics

- **API Coverage:** 100% of endpoints documented
- **SDK Generation:** TypeScript + Python SDKs available
- **Documentation:** Hosted and searchable
- **Migration Support:** 12-month deprecation period
- **Developer Satisfaction:** Positive feedback from integrators

---

**Navigation:**
- **[← Back to Phase 2 Overview](./PHASE_2_MAJOR.md)**
- **[← Previous: Phase 2A - Testing](./PHASE_2A_TESTING.md)**
- **[→ Next: Phase 2C - Performance](./PHASE_2C_PERFORMANCE.md)**
