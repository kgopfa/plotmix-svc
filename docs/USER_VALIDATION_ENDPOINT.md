# User Validation Endpoint

## Overview

The `GET /api/auth/validate-user/:userId` endpoint validates that a user still exists in the database and is active, preventing stale sessions from deleted users.

## Endpoint Details

- **URL**: `GET /api/auth/validate-user/:userId`
- **Authentication**: Requires `X-Internal-Key` header
- **Purpose**: Validate user existence and active status

## Request

### Headers
```
X-Internal-Key: your-secure-internal-api-key-here
Content-Type: application/json
```

### URL Parameters
- `userId` (string, required): The user ID to validate

### Example Request
```bash
curl -X GET "http://localhost:8000/api/auth/validate-user/123" \
  -H "X-Internal-Key: your-secure-internal-api-key-here"
```

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing User ID
```json
{
  "success": false,
  "error": "User ID is required"
}
```

#### 401 Unauthorized - Invalid API Key
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 Not Found - User Doesn't Exist
```json
{
  "success": false,
  "error": "User not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Environment Configuration

Add the following to your `.env` file:

```bash
# Internal API key for secure backend-to-backend communication
INTERNAL_API_KEY=your-secure-internal-api-key-here-minimum-32-characters
```

## Security Considerations

1. **API Key Security**: Use a strong, randomly generated key (minimum 32 characters)
2. **Rate Limiting**: Consider adding rate limiting to prevent abuse
3. **Logging**: All validation attempts are logged for security monitoring
4. **Network Security**: Ensure this endpoint is only accessible from trusted sources

## Testing

### Using the Test Script

Run the provided test script to verify the endpoint:

```bash
# Set your API key in .env first
pnpm ts-node src/scripts/test-validate-user.ts
```

### Manual Testing

```bash
# Valid user (replace with actual user ID)
curl -X GET "http://localhost:8000/api/auth/validate-user/123" \
  -H "X-Internal-Key: your-internal-api-key"

# Invalid user
curl -X GET "http://localhost:8000/api/auth/validate-user/999" \
  -H "X-Internal-Key: your-internal-api-key"

# Missing API key
curl -X GET "http://localhost:8000/api/auth/validate-user/123"
```

## Integration with Frontend

The frontend automatically calls this endpoint to validate user sessions. The integration is already implemented in the auth context:

```typescript
// Frontend automatically validates sessions
const validateSession = async (): Promise<boolean> => {
  // ... validation logic
}
```

## Future Enhancements

1. **User Status Fields**: Add `isActive`, `deletedAt`, `suspendedAt` fields to User model
2. **Caching**: Implement Redis caching for user status with short TTL
3. **Rate Limiting**: Add rate limiting middleware
4. **Audit Logging**: Enhanced logging for compliance requirements

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that `INTERNAL_API_KEY` is set correctly
2. **404 Not Found**: Verify the user ID exists in the database
3. **500 Internal Server Error**: Check server logs for database connection issues

### Logs

The endpoint logs the following events:
- Successful validations
- Failed validations (user not found)
- Invalid API key attempts
- Server errors

Check the application logs for detailed information about validation attempts.
