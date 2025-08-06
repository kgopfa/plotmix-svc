# Authentication Documentation

This document explains the authentication architecture and security considerations for the PlotMix backend API.

## Overview

The PlotMix backend implements a hybrid authentication system that seamlessly integrates with NextAuth.js on the frontend while maintaining separate security boundaries for different operations.

## Secret Management

### Environment Variables

| Variable | Purpose | Security Level | Usage |
|----------|---------|----------------|-------|
| `JWT_SECRET` | Internal backend operations | High | Backend-to-backend communication, internal token generation |
| `NEXTAUTH_SECRET` | Frontend token validation | High | Validating tokens from NextAuth.js frontend |

### Security Recommendations

1. **Use Different Secrets**: Always use different values for `JWT_SECRET` and `NEXTAUTH_SECRET`
2. **Strong Secrets**: Use cryptographically secure random strings (minimum 32 characters)
3. **Environment Separation**: Use different secrets for development, staging, and production
4. **Secret Rotation**: Regularly rotate secrets in production environments

### Example Configuration

```bash
# Backend .env
JWT_SECRET=your-super-secure-internal-jwt-secret-key-64-characters-long
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-key-64-characters-long

# Frontend .env (should match backend NEXTAUTH_SECRET)
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-key-64-characters-long
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Token Flow

### 1. Frontend Authentication (NextAuth.js)

```typescript
// Frontend authentication handled by NextAuth.js
const session = await getSession();
// session.accessToken contains the JWT token
```

### 2. API Request

```typescript
// Frontend sends token in Authorization header
const response = await fetch('/api/projects', {
  headers: {
    'Authorization': `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Backend Validation

```typescript
// Backend validates using NEXTAUTH_SECRET
const decoded = jwt.verify(token, config.nextAuth.secret) as JWTPayload;
```

### 4. Internal Operations (if needed)

```typescript
// Backend generates internal tokens using JWT_SECRET
const internalToken = AuthService.generateInternalToken(user);
```

## Implementation Details

### Authentication Middleware

The backend uses two main authentication middlewares:

1. **`authenticateToken`**: Required authentication for protected routes
2. **`optionalAuth`**: Optional authentication for public routes that can be enhanced with user context

### Token Structure

NextAuth JWT tokens have the following structure:

```typescript
interface JWTPayload {
  sub?: string;     // User ID (NextAuth uses 'sub')
  id?: string;      // Alternative user ID field
  email: string;    // User email
  name?: string;    // User name
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
}
```

### Auth Service Methods

```typescript
// Validate frontend tokens
AuthService.verifyNextAuthToken(token: string): JWTPayload

// Generate NextAuth-compatible tokens
AuthService.generateNextAuthToken(user: User): string

// Generate internal tokens (for backend operations)
AuthService.generateInternalToken(user: User): string

// Validate internal tokens
AuthService.verifyInternalToken(token: string): JWTPayload

// Secure logout with token blacklisting
AuthService.logout(userId: string, token: string): Promise<void>

// Check if token is blacklisted
AuthService.isTokenBlacklisted(token: string): Promise<boolean>
```

## Security Considerations

### 1. Token Validation

- All API requests with `Authorization` header are validated
- Invalid or expired tokens return 403 Forbidden
- Token structure is verified against expected NextAuth format
- **Blacklisted tokens are rejected immediately** (logout protection)

### 2. Secret Isolation

- Frontend tokens are validated using `NEXTAUTH_SECRET`
- Internal operations use `JWT_SECRET`
- Compromise of one secret doesn't affect the other

### 3. Error Handling

- Token validation errors are logged but don't expose sensitive information
- Generic error messages prevent information leakage
- Failed authentication attempts are monitored

### 4. Rate Limiting

- Authentication endpoints are rate-limited to prevent brute force attacks
- Configurable limits per IP address and time window

### 5. Secure Logout

- **Token Blacklisting**: Logged out tokens are immediately invalidated
- **Dual Logout**: Both frontend and backend sessions are cleared
- **Audit Logging**: All logout events are logged with timestamps
- **Graceful Degradation**: Frontend logout continues even if backend fails

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/api/auth/register` | User registration | None |
| POST | `/api/auth/login` | User login | None |
| GET | `/api/auth/profile` | Get user profile | Required |
| **POST** | **`/api/auth/logout`** | **Secure logout** | **Required** |

### Logout Endpoint

**POST /api/auth/logout**

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {
    "logoutTime": "2024-01-01T00:00:00.000Z"
  }
}
```

**Security Features:**
- Token is immediately blacklisted
- User session is invalidated
- Audit log entry is created
- Response includes logout timestamp

## Migration Guide

### From Single Secret to Dual Secret

If you're migrating from a single secret configuration:

1. **Update Environment Variables**:
   ```bash
   # Old configuration
   JWT_SECRET=shared-secret
   
   # New configuration
   JWT_SECRET=internal-secret
   NEXTAUTH_SECRET=frontend-secret
   ```

2. **Update Frontend**:
   ```bash
   # Frontend .env
   NEXTAUTH_SECRET=frontend-secret  # Must match backend NEXTAUTH_SECRET
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Test Authentication**:
   - Verify login/logout functionality
   - Test API requests with authentication
   - Check token validation on protected routes

### Backward Compatibility

The system maintains backward compatibility:
- If `NEXTAUTH_SECRET` is not provided, it falls back to `JWT_SECRET`
- Existing tokens continue to work during migration
- Gradual migration is supported

## Troubleshooting

### Common Issues

1. **"Invalid or expired token" errors**:
   - Check that `NEXTAUTH_SECRET` matches between frontend and backend
   - Verify token format in Authorization header
   - Check token expiration
   - **Check if token has been blacklisted (user logged out)**

2. **Authentication middleware not working**:
   - Ensure middleware is applied to routes
   - Check that tokens are being sent correctly
   - Verify secret configuration

3. **CORS issues with authentication**:
   - Ensure CORS is configured to allow Authorization header
   - Check that credentials are included in requests

4. **Logout not working properly**:
   - Check that `NEXT_PUBLIC_API_URL` is set correctly
   - Verify backend logout endpoint is accessible
   - Check network connectivity between frontend and backend

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your environment:

```bash
LOG_LEVEL=debug
```

This will log detailed authentication information for troubleshooting.

## Best Practices

1. **Never share secrets between environments**
2. **Use environment-specific secrets**
3. **Regularly rotate secrets in production**
4. **Monitor authentication failures**
5. **Implement proper error handling**
6. **Use HTTPS in production**
7. **Validate all inputs**
8. **Log security events**
9. **Always blacklist tokens on logout**
10. **Implement proper session management**

## Security Checklist

- [x] Different secrets for `JWT_SECRET` and `NEXTAUTH_SECRET`
- [x] Strong, cryptographically secure secrets (32+ characters)
- [x] Environment-specific secrets
- [x] HTTPS enabled in production
- [x] Rate limiting configured
- [x] CORS properly configured
- [x] Error handling implemented
- [x] Security headers enabled
- [x] Input validation in place
- [x] Authentication logging enabled
- [x] **Secure logout with token blacklisting**
- [x] **Token invalidation on logout**
- [x] **Audit logging for security events**
- [x] **Graceful error handling for logout failures** 