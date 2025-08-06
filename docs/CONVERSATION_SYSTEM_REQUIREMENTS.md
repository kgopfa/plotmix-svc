# Conversation System Requirements

## Overview

The conversation system enables users to create projects through AI-powered canvas generation. The system handles the complete flow from user input to AI-generated content, with all conversations tied to specific projects.

## System Flow

### 1. User Input
The user navigates to the chat page and submits a prompt, along with any optional:
- Configuration options (e.g., settings or flags)
- Attachments (e.g., files or reference images)

### 2. Backend Processing
Upon prompt submission:
- The backend sends the prompt to OpenAI for processing
- If OpenAI processing fails, an error is returned without creating any resources
- If OpenAI processing succeeds, the backend creates a new project with the generated canvas structure
- It then creates a conversation linked to that project
- The submitted prompt is added as the first user message within the conversation
- The complete response (project, conversation, and all messages) is returned to the frontend

### 3. AI Response Handling
When the backend receives a successful response from OpenAI:
- It creates a project with the generated canvas structure
- It creates a conversation linked to the project
- It creates a system message indicating conversation start
- It creates a user message with the original prompt
- It creates an LLM response message with the AI's explanation
- It creates a canvas generation message with the structured data
- It returns the complete project, conversation, and message history to the frontend

## Database Schema

### Project Model
```prisma
model Project {
  id          String   @id @default(cuid())
  title       String
  description String?
  canvasData  Json?    // Generated canvas structure
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversations Conversation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

### Conversation Model
```prisma
model Conversation {
  id        String   @id @default(cuid())
  title     String
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([projectId])
}
```

### Message Model
```prisma
model Message {
  id             String       @id @default(cuid())
  content        String
  type           MessageType
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  metadata       Json?        // Additional message data (attachments, etc.)
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}

enum MessageType {
  USER
  ASSISTANT
}
```

## API Endpoints

### Primary Entry Point
- `POST /conversations/create-from-prompt` - Create project with conversation from user prompt (primary entry point)

### Project Management
- `POST /projects` - Create new project with AI generation
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Conversation Management
- `POST /conversations` - Create conversation (linked to existing project)
- `GET /conversations/:id` - Get conversation details
- `PUT /conversations/:id` - Update conversation
- `DELETE /conversations/:id` - Delete conversation

### Message Management
- `POST /conversations/:id/messages` - Send message
- `GET /conversations/:id/messages` - Get conversation messages

### Canvas Generation
- `POST /conversations/:id/generate-canvas` - Generate canvas from conversation
- `GET /conversations/:id/generation-stats` - Get generation statistics

## Implementation Phases

### Phase 1: Database & Basic CRUD ✅
- [x] Update Prisma schema with new models
- [x] Run database migrations
- [x] Implement ConversationService
- [x] Implement MessageService
- [x] Implement ProjectFeaturesService
- [x] Create basic API endpoints
- [x] Add authentication middleware
- [x] Add feature validation middleware

### Phase 2: LLM Integration (OpenAI) ✅
- [x] Install and configure OpenAI SDK
- [x] Implement OpenAI service with configuration
- [x] Create system prompt templates
- [x] Add canvas generation logic
- [x] Create CanvasGenerationService
- [x] Implement message processing
- [x] Add feature-aware LLM processing
- [x] Add OpenAI error handling and retry logic
- [x] Add response parsing and validation

### Phase 3: Project Integration ✅
- [x] Link conversations to projects
- [x] Implement canvas update logic
- [x] Add project creation from canvas
- [x] Handle conversation branching

### Phase 4: Frontend Integration ✅
- [x] Update chat page to use new API
- [x] Integrate with content page
- [x] Add conversation management UI
- [x] Implement real-time updates

### Phase 5: Testing & Optimization
- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation updates

## Key Features

### Project Creation Flow
1. User submits prompt on chat page
2. Backend creates project record
3. Backend creates conversation linked to project
4. Backend adds user message to conversation
5. Backend sends prompt to OpenAI for canvas generation
6. Backend updates project with generated canvas structure
7. Frontend receives project data and navigates to content page

### Conversation Management
- All conversations are tied to specific projects
- Messages include metadata for attachments and configuration
- Real-time updates via polling or WebSocket
- Conversation history with pagination

### Canvas Generation
- AI-powered canvas structure generation
- Support for attachments and configuration options
- Generation statistics and monitoring
- Error handling and retry logic

## Error Handling

### Network Errors
- Retry logic for failed API calls
- Graceful degradation for offline scenarios
- User-friendly error messages

### AI Generation Errors
- Fallback responses for failed generations
- Partial generation handling
- User notification of generation status

### Database Errors
- Transaction rollback on failures
- Data consistency checks
- Audit logging for debugging

## Security Considerations

### Authentication
- JWT token validation on all endpoints
- User ownership verification for projects and conversations
- Rate limiting for API endpoints

### Data Privacy
- User data isolation
- Secure message storage
- Attachment file validation

### API Security
- Input validation and sanitization
- SQL injection prevention
- CORS configuration

## Performance Optimization

### Database
- Indexed queries for common operations
- Pagination for large datasets
- Efficient relationship queries

### Caching
- Redis caching for frequently accessed data
- Conversation message caching
- Project metadata caching

### Real-time Updates
- Polling mechanism (Phase 4)
- WebSocket integration (future enhancement)
- Optimistic UI updates

## Monitoring & Analytics

### Metrics
- Conversation creation rates
- Message volume and response times
- Canvas generation success rates
- User engagement metrics

### Logging
- Structured logging for debugging
- Error tracking and alerting
- Performance monitoring
- User activity tracking

## Future Enhancements

### Advanced AI Features
- Multi-modal input support (voice, images)
- Context-aware responses
- Personalized canvas generation
- Advanced prompt engineering

### Collaboration Features
- Multi-user conversations
- Real-time collaboration
- Shared project workspaces
- Comment and annotation system

### Integration Features
- Third-party service integration
- Export/import functionality
- API webhooks
- Custom canvas templates 