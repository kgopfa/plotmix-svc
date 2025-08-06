# PlotMix API Documentation

## Overview
This API provides a complete versioned canvas projects system with collaboration features, version control, user management, and AI-powered conversation system for canvas generation.

> **Note**: For detailed conversation system requirements and implementation details, see [Conversation System Requirements](./CONVERSATION_SYSTEM_REQUIREMENTS.md).

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User
```
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login User
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Get User Profile
```
GET /auth/profile
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Projects

#### Create Project
```
POST /projects
```

**Request Body:**
```json
{
  "name": "My Canvas Project",
  "mainState": {
    "elements": [],
    "canvas": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": "project_id",
      "name": "My Canvas Project",
      "mainState": { "elements": [], "canvas": { "width": 1920, "height": 1080 } },
      "version": "1.0.0",
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get User Projects
```
GET /projects
```

**Response:**
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": {
    "projects": [
      {
        "id": "project_id",
        "name": "My Canvas Project",
        "mainState": { "elements": [], "canvas": { "width": 1920, "height": 1080 } },
        "version": "1.0.0",
        "userId": "user_id",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### Get Project Details
```
GET /projects/:projectId
```

**Response:**
```json
{
  "success": true,
  "message": "Project retrieved successfully",
  "data": {
    "project": {
      "id": "project_id",
      "name": "My Canvas Project",
      "mainState": { "elements": [], "canvas": { "width": 1920, "height": 1080 } },
      "version": "1.0.0",
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "owner": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "changes": [
        {
          "id": "change_id",
          "version": "1.1.0",
          "diff": { "op": "add", "path": "/elements/0", "value": { "type": "rectangle" } },
          "actionDescription": "Added rectangle",
          "createdAt": "2024-01-01T01:00:00.000Z"
        }
      ],
      "snapshots": [],
      "collaborators": []
    }
  }
}
```

#### Update Project
```
PUT /projects/:projectId
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "mainState": {
    "elements": [{"type": "rectangle"}],
    "canvas": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

#### Delete Project
```
DELETE /projects/:projectId
```

## Conversation Endpoints

### Create Project with Conversation from Prompt
```
POST /conversations/create-from-prompt
```

**Description:** Primary entry point for users. Sends the prompt to OpenAI first. If OpenAI processing succeeds, creates a project and conversation with the generated canvas structure. The project title and description are extracted from the LLM response metadata. If OpenAI fails, returns an error without creating any resources.

**Request Body:**
```json
{
  "prompt": "Create a system architecture diagram for a microservices application",
  "title": "System Architecture Discussion",
  "features": {
    "attachments": { "enabled": true },
    "webSearch": { "enabled": false },
    "audio": { "enabled": false },
    "music": { "enabled": false }
  },
  "attachments": [
    {
      "id": "attachment_id",
      "name": "reference.png",
      "type": "image/png",
      "size": "1024"
    }
  ],
  "options": {
    "webSearch": false,
    "audio": false,
    "music": false
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Project and conversation created successfully",
  "data": {
    "project": {
      "id": "project_id",
      "name": "System Architecture Diagram for Microservices",
      "mainState": {
        "elements": [...],
        "connections": [...],
        "metadata": {
          "title": "System Architecture Diagram for Microservices",
          "description": "A comprehensive system architecture diagram showing microservices components, data flow, and infrastructure"
        }
      },
      "features": {...},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "conversation": {
      "id": "conversation_id",
      "title": "System Architecture Diagram for Microservices",
      "projectId": "project_id",
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "messages": [
      {
        "id": "system_message_id",
        "content": "Conversation started",
        "messageType": "system",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "user_message_id",
        "content": "Create a system architecture diagram for a microservices application",
        "messageType": "user",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "llm_message_id",
        "content": "I'll help you create a system architecture diagram...",
        "messageType": "llm",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "canvas_message_id",
        "content": "{\"elements\":[...],\"connections\":[...]}",
        "messageType": "canvas_generation",
        "metadata": {
          "success": true,
          "elementCount": 5,
          "connectionCount": 3
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Error Response (OpenAI fails):**
```json
{
  "success": false,
  "message": "Failed to process prompt with AI",
  "error": "OpenAI API error details"
}
```

### Version Control
```
POST /projects/:projectId/changes
```

**Request Body:**
```json
{
  "version": "1.1.0",
  "diff": {
    "op": "add",
    "path": "/elements/0",
    "value": {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150
    }
  },
  "actionDescription": "Added rectangle element",
  "clientHash": "abc123"
}
```

#### Create Snapshot
```
POST /projects/:projectId/snapshots
```

**Request Body:**
```json
{
  "version": "1.5.0"
}
```

#### Get Project History
```
GET /projects/:projectId/history
```

**Response:**
```json
{
  "success": true,
  "message": "Project history retrieved successfully",
  "data": {
    "history": {
      "project": { /* project details */ },
      "changes": [
        {
          "version": "1.1.0",
          "timestamp": "2024-01-01T01:00:00.000Z",
          "authorId": "user_id",
          "authorName": "John Doe",
          "actionDescription": "Added rectangle"
        }
      ],
      "snapshots": [
        {
          "version": "1.5.0",
          "timestamp": "2024-01-01T02:00:00.000Z",
          "authorId": "",
          "authorName": "System"
        }
      ]
    }
  }
}
```

#### Rollback to Version
```
POST /projects/:projectId/rollback/:version
```

### Collaboration

#### Invite User to Project
```
POST /collaboration/:projectId/invite
```

**Request Body:**
```json
{
  "userId": "invited_user_id",
  "role": "editor"
}
```

#### Update Invitation
```
PUT /collaboration/:projectId/invite/:userId
```

**Request Body:**
```json
{
  "role": "viewer",
  "status": "accepted"
}
```

#### Respond to Invitation
```
POST /collaboration/:projectId/respond
```

**Request Body:**
```json
{
  "response": "accepted"
}
```

#### Remove Collaborator
```
DELETE /collaboration/:projectId/collaborators/:userId
```

#### Get Project Collaborators
```
GET /collaboration/:projectId/collaborators
```

#### Get User Invitations
```
GET /collaboration/invitations
```

#### Get User Collaborations
```
GET /collaboration/collaborations
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Data Models

### Project State Structure
The `mainState` field contains the canvas project data in JSON format. Example structure:

```json
{
  "elements": [
    {
      "id": "element_1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#ff0000",
      "stroke": "#000000"
    }
  ],
  "canvas": {
    "width": 1920,
    "height": 1080,
    "backgroundColor": "#ffffff"
  },
  "layers": [
    {
      "id": "layer_1",
      "name": "Background",
      "visible": true,
      "locked": false
    }
  ]
}
```

### Change Diff Format
The `diff` field uses JSON Patch format for describing changes:

```json
[
  {
    "op": "add",
    "path": "/elements/0",
    "value": { "type": "rectangle", "x": 100, "y": 100 }
  },
  {
    "op": "replace",
    "path": "/elements/0/fill",
    "value": "#00ff00"
  },
  {
    "op": "remove",
    "path": "/elements/1"
  }
]
```

## Security Features

- JWT-based authentication
- Role-based access control (owner, editor, viewer)
- Project-level permissions
- Secure password hashing with bcrypt
- Input validation and sanitization
- Comprehensive error logging

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse.

## WebSocket Support

For real-time collaboration, consider adding WebSocket support for:
- Live project updates
- Real-time cursor positions
- Collaborative editing indicators
- Change notifications 