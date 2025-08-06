# Conversation System Requirements

## Overview
Implement a conversation and message system that allows users to interact with an LLM to generate and modify canvas designs. The system will maintain conversation context and associate canvas generations with projects.

## Database Schema Changes

### 1. New Models Required

#### Conversation Model
```prisma
model Conversation {
  id        String   @id @default(cuid())
  title     String?  // Auto-generated or user-provided
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  userId        String @map("user_id")
  user          User   @relation("UserConversations", fields: [userId], references: [id], onDelete: Cascade)
  messages      Message[]
  projectId     String? @map("project_id") // Optional: only for canvas-related conversations
  project       Project? @relation("ConversationProject", fields: [projectId], references: [id], onDelete: SetNull)

  @@map("conversations")
}
```

#### Message Model
```prisma
model Message {
  id        String   @id @default(cuid())
  content   String   // The actual message content
  role      String   // "user" | "assistant" | "system"
  metadata  Json?    // Additional data like canvas state, attachments, etc.
  createdAt DateTime @default(now())

  // Relations
  conversationId String      @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("messages")
}
```

### 2. Update Existing Models

#### User Model
```prisma
model User {
  // ... existing fields ...
  
  // Add new relations
  conversations Conversation[] @relation("UserConversations")
}
```

#### Project Model
```prisma
model Project {
  // ... existing fields ...
  
  // Add new relations
  conversations Conversation[] @relation("ConversationProject")
}
```

## API Endpoints

### 1. Conversation Management

#### Create New Conversation
- **POST** `/api/conversations`
- **Purpose**: Start a new conversation for canvas generation
- **Request Body**:
  ```typescript
  {
    title?: string; // Optional, auto-generated if not provided
    initialPrompt?: string; // Optional first message
  }
  ```
- **Response**: New conversation with ID and optional initial message

#### Get User Conversations
- **GET** `/api/conversations`
- **Purpose**: List all conversations for the authenticated user
- **Query Params**: `page`, `limit`, `projectId?` (filter by project)
- **Response**: Paginated list of conversations with metadata

#### Get Single Conversation
- **GET** `/api/conversations/:id`
- **Purpose**: Get conversation details with all messages
- **Response**: Conversation with full message history

#### Update Conversation
- **PUT** `/api/conversations/:id`
- **Purpose**: Update conversation title or metadata
- **Request Body**:
  ```typescript
  {
    title?: string;
  }
  ```

#### Delete Conversation
- **DELETE** `/api/conversations/:id`
- **Purpose**: Delete conversation and all associated messages

### 2. Message Management

#### Send Message
- **POST** `/api/conversations/:id/messages`
- **Purpose**: Send a message to the LLM and get response
- **Request Body**:
  ```typescript
  {
    content: string;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      size: string;
    }>;
    options?: {
      webSearch?: boolean;
      audio?: boolean;
      music?: boolean;
    };
  }
  ```
- **Response**: Both user message and LLM response with canvas data

#### Get Messages
- **GET** `/api/conversations/:id/messages`
- **Purpose**: Get paginated messages for a conversation
- **Query Params**: `page`, `limit`, `before` (timestamp)
- **Response**: Paginated messages

### 3. Canvas Generation

#### Generate Canvas
- **POST** `/api/conversations/:id/generate-canvas`
- **Purpose**: Generate a new canvas based on conversation context
- **Request Body**:
  ```typescript
  {
    prompt: string;
    options?: {
      style?: string;
      dimensions?: { width: number; height: number };
    };
  }
  ```
- **Response**: Generated canvas data and new project

#### Update Canvas
- **PUT** `/api/projects/:id/canvas`
- **Purpose**: Update existing canvas based on follow-up prompt
- **Request Body**:
  ```typescript
  {
    prompt: string;
    canvasState: Record<string, any>;
  }
  ```

## Service Layer Implementation

### 1. ConversationService
- `createConversation(userId: string, data: CreateConversationRequest)`
- `getUserConversations(userId: string, filters: ConversationFilters)`
- `getConversation(id: string, userId: string)`
- `updateConversation(id: string, userId: string, data: UpdateConversationRequest)`
- `deleteConversation(id: string, userId: string)`

### 2. MessageService
- `sendMessage(conversationId: string, userId: string, data: SendMessageRequest)`
- `getMessages(conversationId: string, userId: string, pagination: PaginationOptions)`
- `processLLMResponse(prompt: string, conversationContext: Message[])`

### 3. CanvasGenerationService
- `generateCanvas(prompt: string, conversationContext: Message[])`
- `updateCanvas(projectId: string, prompt: string, currentState: any)`
- `createProjectFromCanvas(canvasData: any, userId: string, conversationId: string)`

### 4. LLM Integration Service
- `callLLM(messages: Message[], options: LLMOptions)`
- `parseCanvasResponse(llmResponse: string)`
- `validateCanvasData(canvasData: any)`

## Business Logic Requirements

### 1. Conversation Flow
1. User creates new conversation → Create conversation record
2. User sends initial prompt → Create user message, call LLM, create assistant message
3. If LLM generates canvas → Create new project, link to conversation
4. For follow-ups → Add messages to existing conversation, update project if canvas changes

### 2. Canvas Generation Logic
1. Parse user prompt for canvas requirements
2. Call LLM with conversation context
3. Parse LLM response for canvas structure
4. Validate canvas data
5. Create or update project with canvas state
6. Return canvas data to frontend

### 3. Context Management
- Maintain conversation history for context
- Include previous canvas states in LLM prompts
- Handle conversation branching for different canvas versions

## Frontend Integration Points

### 1. Chat Page (`/chat`)
- Create new conversation on first prompt
- Send messages to conversation endpoint
- Display conversation history
- Handle canvas generation responses

### 2. Content Page (`/content/[contentId]`)
- Load conversation by content ID
- Display conversation history
- Allow follow-up questions
- Link to editor for canvas modifications

### 3. Editor Integration
- Load project canvas from conversation
- Save canvas changes back to project
- Create new conversation branches for major changes

## Security & Validation

### 1. Authentication
- All endpoints require valid JWT token
- Users can only access their own conversations
- Validate user ownership for all operations

### 2. Input Validation
- Validate message content length and format
- Sanitize user inputs
- Validate canvas data structure
- Rate limiting for LLM calls

### 3. Data Integrity
- Ensure conversation-project relationships are maintained
- Handle orphaned conversations/projects
- Validate message ordering and timestamps

## Error Handling

### 1. LLM Service Errors
- Handle LLM API failures gracefully
- Retry logic for transient failures
- Fallback responses for critical errors

### 2. Database Errors
- Handle concurrent conversation updates
- Rollback failed transactions
- Log errors for debugging

### 3. User Experience
- Clear error messages for users
- Graceful degradation when services are unavailable
- Progress indicators for long-running operations

## Testing Requirements

### 1. Unit Tests
- Service layer methods
- Data validation logic
- Error handling scenarios

### 2. Integration Tests
- API endpoint functionality
- Database operations
- LLM integration

### 3. End-to-End Tests
- Complete conversation flow
- Canvas generation process
- Frontend integration

## Performance Considerations

### 1. Database Optimization
- Index on conversation.userId and message.conversationId
- Pagination for large message histories
- Efficient queries for conversation lists

### 2. LLM Integration
- Async processing for long-running generations
- Caching for repeated prompts
- Batch processing for multiple requests

### 3. Frontend Performance
- Lazy loading of conversation history
- Optimistic updates for better UX
- Efficient state management

## Implementation Checklist

### Phase 1: Database & Basic CRUD
- [ ] Update Prisma schema with new models
- [ ] Run database migrations
- [ ] Implement ConversationService
- [ ] Implement MessageService
- [ ] Create basic API endpoints
- [ ] Add authentication middleware

### Phase 2: LLM Integration
- [ ] Implement LLM service
- [ ] Add canvas generation logic
- [ ] Create CanvasGenerationService
- [ ] Implement message processing
- [ ] Add error handling

### Phase 3: Project Integration
- [ ] Link conversations to projects
- [ ] Implement canvas update logic
- [ ] Add project creation from canvas
- [ ] Handle conversation branching

### Phase 4: Frontend Integration
- [ ] Update chat page to use new API
- [ ] Integrate with content page
- [ ] Add conversation management UI
- [ ] Implement real-time updates

### Phase 5: Testing & Optimization
- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation updates

## Future Enhancements

### 1. Advanced Features
- Conversation templates
- Canvas style presets
- Collaborative conversations
- Conversation export/import

### 2. AI Enhancements
- Conversation summarization
- Smart conversation suggestions
- Canvas style learning
- Multi-modal inputs (voice, images)

### 3. Analytics
- Conversation analytics
- Canvas generation metrics
- User behavior tracking
- Performance monitoring 