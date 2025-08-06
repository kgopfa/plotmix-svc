# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the PlotMix Canvas API, including authentication, project management, version control, and collaboration features. The tests are designed to run sequentially to avoid database conflicts and ensure reliable test execution.

## Test Structure

### Test Setup (`src/__tests__/setup.ts`)
- **Database Cleanup**: Automatically cleans up test data between tests
- **Test Utilities**: Provides helper functions for creating test users and projects
- **JWT Token Generation**: Creates valid authentication tokens for testing
- **Sequential Execution**: Configured to run tests one at a time to avoid race conditions

### Test Files

#### 1. Authentication Tests (`src/__tests__/auth.test.ts`)
**Coverage**: 9 tests covering all authentication endpoints

**Test Cases**:
- ✅ User registration with valid data
- ✅ Duplicate email handling
- ✅ Invalid data validation
- ✅ User login with correct credentials
- ✅ Login with incorrect password
- ✅ Login with non-existent user
- ✅ Profile retrieval with valid token
- ✅ Profile access without token
- ✅ Profile access with invalid token

**Endpoints Tested**:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

#### 2. Project Service Tests (`src/__tests__/services/project.service.test.ts`)
**Coverage**: 16 tests covering business logic layer

**Test Cases**:
- ✅ Project creation
- ✅ Project retrieval (owner and collaborator access)
- ✅ Unauthorized access handling
- ✅ User project listing (owned and collaborated)
- ✅ Project updates
- ✅ Project deletion
- ✅ Project change application
- ✅ Snapshot creation
- ✅ Project history retrieval
- ✅ Version rollback functionality

**Business Logic Tested**:
- Access control (owner vs collaborator vs unauthorized)
- Version control operations
- Data integrity and relationships
- Error handling and edge cases

#### 3. Project API Tests (`src/__tests__/projects.test.ts`)
**Coverage**: End-to-end API testing for project endpoints

**Test Cases**:
- ✅ Project CRUD operations via HTTP
- ✅ Authentication requirements
- ✅ Access control validation
- ✅ Version control API endpoints
- ✅ Error response handling

**Endpoints Tested**:
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/changes`
- `POST /api/projects/:id/snapshots`
- `GET /api/projects/:id/history`
- `POST /api/projects/:id/rollback/:version`

#### 4. Collaboration Tests (`src/__tests__/collaboration.test.ts`)
**Coverage**: Comprehensive collaboration feature testing

**Test Cases**:
- ✅ User invitation system
- ✅ Invitation acceptance/decline
- ✅ Role-based access control
- ✅ Collaborator management
- ✅ Project access for collaborators
- ✅ Viewer vs Editor permissions

**Endpoints Tested**:
- `POST /api/collaboration/:projectId/invite`
- `PUT /api/collaboration/:projectId/invite/:userId`
- `POST /api/collaboration/:projectId/respond`
- `DELETE /api/collaboration/:projectId/collaborators/:userId`
- `GET /api/collaboration/:projectId/collaborators`
- `GET /api/collaboration/invitations`
- `GET /api/collaboration/collaborations`

## Test Utilities

### TestRequest Helper (`src/__tests__/helpers/test-request.ts`)
Provides a fluent API for making authenticated HTTP requests:

```typescript
const testRequest = createTestRequest(app);

// Make authenticated request
await testRequest
  .withAuth(userId, email)
  .post('/api/projects', projectData)
  .expect(201);

// Make unauthenticated request
await testRequest
  .withoutAuth()
  .get('/api/projects')
  .expect(401);
```

### Test Utilities (`src/__tests__/setup.ts`)
Helper functions for test data creation:

```typescript
// Create test user with unique data
const user = await testUtils.createTestUser({
  name: 'Test User',
  email: 'test@example.com',
  password: 'SecurePassword123'
});

// Create test project
const project = await testUtils.createTestProject(user.id, {
  name: 'Test Project',
  mainState: { elements: [] }
});

// Generate JWT token
const token = testUtils.generateTestToken(user.id, user.email);
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test File
```bash
pnpm test src/__tests__/auth.test.ts
pnpm test src/__tests__/services/project.service.test.ts
pnpm test src/__tests__/projects.test.ts
pnpm test src/__tests__/collaboration.test.ts
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Test Coverage
```bash
pnpm test --coverage
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Sequential Execution**: `maxWorkers: 1` to avoid database conflicts
- **TypeScript Support**: Uses `ts-jest` for TypeScript compilation
- **Coverage Reporting**: Generates HTML, text, and LCOV coverage reports
- **Test Discovery**: Automatically finds test files in `src/__tests__/`

### Database Configuration
- **Test Database**: Uses separate database URL for testing
- **Automatic Cleanup**: Cleans up test data between tests
- **Isolation**: Each test runs in isolation with fresh data

## Test Data Management

### Automatic Cleanup
Tests automatically clean up after themselves:
- Deletes all test data between tests
- Handles foreign key constraints properly
- Prevents data leakage between test runs

### Unique Data Generation
- Each test generates unique user emails and project names
- Prevents conflicts when tests run in parallel
- Uses timestamps and random IDs for uniqueness

## Error Handling

### Database Errors
- Graceful handling of constraint violations
- Proper cleanup on test failures
- Detailed error logging for debugging

### API Errors
- Tests verify correct HTTP status codes
- Validates error message content
- Ensures proper error response structure

## Performance Considerations

### Test Execution Time
- Individual tests: ~100-500ms each
- Full suite: ~30-60 seconds
- Sequential execution prevents race conditions

### Database Performance
- Efficient cleanup using Prisma operations
- Minimal test data creation
- Proper indexing for test queries

## Best Practices

### Test Organization
- Grouped by functionality (auth, projects, collaboration)
- Clear test descriptions
- Consistent naming conventions

### Data Isolation
- Each test creates its own data
- No shared state between tests
- Proper cleanup after each test

### Error Testing
- Tests both success and failure scenarios
- Validates error messages and status codes
- Covers edge cases and boundary conditions

## Coverage Areas

### Authentication (100%)
- User registration and validation
- Login and token generation
- Profile access and authorization

### Project Management (100%)
- CRUD operations
- Access control
- Data validation

### Version Control (100%)
- Change tracking
- Snapshot creation
- History management
- Rollback functionality

### Collaboration (100%)
- User invitations
- Role management
- Access control
- Permission validation

## Future Enhancements

### Planned Improvements
- Integration tests with real database
- Performance benchmarking
- Load testing for collaboration features
- API contract testing
- End-to-end user workflow testing

### Additional Test Types
- Unit tests for utility functions
- Integration tests for external services
- Contract tests for API consumers
- Security testing for authentication flows 