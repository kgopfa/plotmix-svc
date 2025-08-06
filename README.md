# PlotMix API Server

A production-grade Node.js backend server built with TypeScript, Express, and JWT authentication.

## Features

- 🔐 JWT-based authentication
- 🛡️ Security middleware (Helmet, CORS, Rate Limiting)
- 📝 Request validation with express-validator
- 📊 Structured logging with Winston
- 🧪 Testing setup with Jest
- 🔧 TypeScript with strict configuration
- 📦 Production-ready build process

## Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Replace `[YOUR-PASSWORD]` in `DATABASE_URL` and `DIRECT_URL` with your actual Supabase password
   - Set `JWT_SECRET` to a secure secret key for internal backend operations
   - Set `NEXTAUTH_SECRET` to match your frontend NextAuth secret (for token validation)

5. Set up the database:
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Push schema to database (creates tables)
   pnpm db:push
   
   # Optional: Seed the database with test data
   pnpm db:seed
   ```

## Development

Start the development server:
```bash
pnpm dev
```

The server will be available at `http://localhost:3000`

## Production

Build the application:
```bash
pnpm build
```

Start the production server:
```bash
pnpm start
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /api/auth/profile
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Health & Status

#### GET /
Server information.

**Response:**
```json
{
  "success": true,
  "message": "PlotMix API Server",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

#### GET /api/success
Protected endpoint that returns a success message (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Success! You have successfully authenticated and accessed the protected endpoint.",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "user": {
      "userId": "user_1234567890_abc123",
      "email": "user@example.com"
    }
  }
}
```

## Testing

Run tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

## Database

### Commands

Generate Prisma client:
```bash
pnpm db:generate
```

Push schema changes to database:
```bash
pnpm db:push
```

Create and run migrations:
```bash
pnpm db:migrate
```

Open Prisma Studio (database GUI):
```bash
pnpm db:studio
```

Seed database with test data:
```bash
pnpm db:seed
```

## Linting

Run linter:
```bash
pnpm lint
```

Fix linting issues:
```bash
pnpm lint:fix
```

## Type Checking

Run TypeScript type checking:
```bash
pnpm type-check
```

## Documentation

For detailed documentation, see the [docs/](./docs/) directory:

- **[API Documentation](./docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Authentication Guide](./docs/AUTHENTICATION.md)** - Authentication system details
- **[Test Suite](./docs/TEST_SUITE.md)** - Testing documentation
- **[Conversation System](./docs/CONVERSATION_SYSTEM_REQUIREMENTS.md)** - Conversation and message system requirements

## Project Structure

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── index.ts         # Server entry point
docs/                # Documentation files
├── README.md        # Documentation index
├── API_DOCUMENTATION.md
├── AUTHENTICATION.md
├── TEST_SUITE.md
└── CONVERSATION_SYSTEM_REQUIREMENTS.md
```

## Authentication Architecture

This backend supports a hybrid authentication system that works seamlessly with NextAuth.js on the frontend:

### Secret Management
- **JWT_SECRET**: Used for internal backend operations and backend-to-backend communication
- **NEXTAUTH_SECRET**: Used to validate tokens from the NextAuth.js frontend (should match frontend NEXTAUTH_SECRET)

### Token Flow
1. **Frontend Authentication**: NextAuth.js handles user authentication and creates JWT tokens
2. **API Requests**: Frontend sends NextAuth tokens in Authorization header
3. **Backend Validation**: Backend validates tokens using NEXTAUTH_SECRET
4. **Internal Operations**: Backend uses JWT_SECRET for internal token generation when needed

### Security Benefits
- **Separation of Concerns**: Different secrets for different purposes
- **Reduced Attack Surface**: Compromise of one secret doesn't affect the other
- **NextAuth Compatibility**: Seamless integration with NextAuth.js frontend
- **Backward Compatibility**: Falls back to JWT_SECRET if NEXTAUTH_SECRET is not provided

## Security Features

- **JWT Authentication**: Secure token-based authentication with separate secrets for frontend and backend
- **NextAuth Integration**: Validates frontend NextAuth tokens using shared secret
- **Password Hashing**: Bcrypt with 14 salt rounds for production security
- **Rate Limiting**: Configurable request rate limiting
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Request body validation
- **Error Handling**: Secure error responses

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| JWT_SECRET | Internal JWT secret for backend operations | fallback-secret-key |
| JWT_EXPIRES_IN | JWT expiration time | 24h |
| NEXTAUTH_SECRET | NextAuth secret for frontend token validation | JWT_SECRET (fallback) |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 (15min) |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
| LOG_LEVEL | Logging level | info |
| DATABASE_URL | Supabase connection pooling URL | postgresql://... |
| DIRECT_URL | Direct Supabase connection URL | postgresql://... |

## License

MIT 