# Message User Tracking System

## Overview

The message user tracking system allows us to track which user sent each message in a conversation. This is essential for multi-user conversations and for distinguishing between user messages and system-generated messages (like LLM responses).

## Database Schema

### Message Model
```prisma
model Message {
  id             String       @id @default(cuid())
  content        String
  messageType    String       @map("message_type")
  metadata       Json?
  attachments    Json?
  options        Json?
  createdAt      DateTime     @default(now())
  conversationId String       @map("conversation_id")
  userId         String       @map("user_id")  // NEW: Tracks message author
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation("MessageAuthor", fields: [userId], references: [id], onDelete: Cascade)
}
```

### User Model
```prisma
model User {
  // ... existing fields
  messages       Message[]    @relation("MessageAuthor")  // NEW: Messages authored by this user
}
```

## Message Types and User Attribution

### 1. User Messages
- **Message Type**: `user`
- **User**: Real user account (the person who sent the message)
- **Example**: User asks "Can you help me create a diagram?"

### 2. LLM Messages
- **Message Type**: `llm`
- **User**: System user (`system@plotmix.ai`)
- **Example**: AI responds "I'd be happy to help you create a diagram!"

### 3. System Messages
- **Message Type**: `system`
- **User**: System user (`system@plotmix.ai`)
- **Example**: "Conversation started" or "Canvas generated"

### 4. Error Messages
- **Message Type**: `error`
- **User**: System user (`system@plotmix.ai`)
- **Example**: "Failed to generate canvas" or "Invalid input"

## System User

A special system user account is used for all non-human messages:

- **Email**: `system@plotmix.ai`
- **Name**: `PlotMix AI`
- **Purpose**: Attributed to all LLM, system, and error messages
- **Login**: This user cannot log in (password is not usable)

## Implementation Details

### Utility Functions

```typescript
// Get system user ID (cached for performance)
export async function getSystemUserId(): Promise<string>

// Create system user if it doesn't exist
export async function createSystemUserIfNotExists(): Promise<string>
```

### Service Updates

All message creation services have been updated to include the `userId` field:

1. **ConversationService.addMessage()** - Uses the authenticated user's ID
2. **ContentGenService.createConversationMessages()** - Uses real user for user messages, system user for LLM messages
3. **ContentGenService.createSystemMessage()** - Uses system user
4. **ContentGenService.createErrorMessage()** - Uses system user

### Query Updates

Message queries now include user relationships:

```typescript
// Get messages with user information
const messages = await prisma.message.findMany({
  where: { conversationId },
  include: {
    user: true,  // Include user details
  }
});
```

## Migration

The database migration (`20250807133508_add_user_to_messages`) handles existing data by:

1. Adding `user_id` column as nullable
2. Updating existing messages to link to conversation owner
3. Making the column required
4. Adding foreign key constraint

## Benefits

1. **Multi-user Support**: Track who sent each message in collaborative conversations
2. **Audit Trail**: Complete history of who said what and when
3. **UI Differentiation**: Frontend can display different styling for user vs AI messages
4. **Analytics**: Track user engagement and AI usage patterns
5. **Security**: Ensure users can only access their own messages

## Frontend Integration

The frontend can now:

- Display user names/avatars for each message
- Apply different styling for user vs AI messages
- Show conversation participants
- Filter messages by user
- Track user activity and engagement

## Security Considerations

- Users can only access messages in conversations they own
- System user cannot be used for authentication
- All message queries include user access validation
- Foreign key constraints ensure data integrity
