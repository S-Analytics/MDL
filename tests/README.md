# MDL Test Suite

This directory contains all test files for the Metrics Definition Library (MDL).

## Structure

The test directory structure mirrors the source code structure for clear alignment:

```
tests/
├── config/          # Tests for configuration loading and parsing
│   └── ConfigLoader.test.ts
├── opa/             # Tests for OPA policy generation
│   └── PolicyGenerator.test.ts
└── storage/         # Tests for metric storage and persistence
    ├── MetricStore.test.ts              # In-memory metric store (file-based)
    ├── PostgresMetricStore.test.ts      # PostgreSQL metric store
    ├── PostgresDomainStore.test.ts      # PostgreSQL domain store
    └── PostgresObjectiveStore.test.ts   # PostgreSQL objective store
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npm test -- tests/config/ConfigLoader.test.ts

# Run only PostgreSQL tests
npm test -- PostgresMetricStore
npm test -- PostgresDomainStore
npm test -- PostgresObjectiveStore
```

## PostgreSQL Tests

The PostgreSQL integration tests require a running PostgreSQL instance with the MDL schema.

### Setup for PostgreSQL Tests

1. **Create test database:**
   ```bash
   psql -U postgres -c "CREATE DATABASE mdl_test;"
   ```

2. **Setup schema:**
   ```bash
   DB_NAME=mdl_test DB_PASSWORD=yourpass node scripts/setup-database.js
   ```

3. **Set environment variables:**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=mdl_test
   export DB_USER=postgres
   export DB_PASSWORD=yourpassword
   ```

4. **Run PostgreSQL tests:**
   ```bash
   npm test -- Postgres
   ```

### Test Database Management

- Tests automatically clean up test data after each test
- Test data uses prefixes like `TEST-`, `test-` to isolate from real data
- Use a separate test database (`mdl_test`) to avoid affecting development data
- Tests will be skipped if `DB_PASSWORD` environment variable is not set

### PostgreSQL Test Coverage

- **PostgresMetricStore**: Create, read, update, delete metrics with JSONB fields
- **PostgresDomainStore**: Manage business domains with arrays and metadata
- **PostgresObjectiveStore**: Handle objectives with cascading key results, transactions
- **Connection pooling**: Concurrent operations and connection management
- **Error handling**: Connection failures, constraint violations, rollbacks

## Test Structure

Each test file follows the pattern:
- **Describe blocks** group related tests by functionality
- **beforeEach/afterEach** handle test setup and cleanup
- **Test names** clearly describe what is being tested

## Writing Tests

When adding new tests:

1. Create test files in the corresponding subdirectory that mirrors `src/`
2. Use descriptive test names that explain the expected behavior
3. Import from source using relative paths: `../../src/module/file`
4. Clean up any resources (files, connections) in `afterEach` hooks
5. Use sample/mock data consistently across tests

## Test Categories

### Unit Tests
- Test individual functions and methods in isolation
- Mock external dependencies
- Focus on business logic
- Examples: ConfigLoader, PolicyGenerator

### Integration Tests
- Test interaction between components
- Use real file system for file operations
- Verify data persistence and retrieval
- Examples: MetricStore (file-based)

### Database Integration Tests
- Test database operations with real PostgreSQL instance
- Verify CRUD operations, transactions, and constraints
- Test connection pooling and error handling
- Require database setup and environment configuration
- Examples: PostgresMetricStore, PostgresDomainStore, PostgresObjectiveStore
- **Note**: These tests are skipped if database is not configured

## Coverage

Coverage reports are generated in the `coverage/` directory and include:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Aim for >80% coverage on new code.
