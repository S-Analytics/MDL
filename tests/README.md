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
    └── MetricStore.test.ts
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
```

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

### Integration Tests
- Test interaction between components
- Use real file system for file operations
- Verify data persistence and retrieval

## Coverage

Coverage reports are generated in the `coverage/` directory and include:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Aim for >80% coverage on new code.
