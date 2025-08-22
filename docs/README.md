# Plotmix Backend Documentation

This directory contains all documentation for the Plotmix backend service.

## Documentation Index

### Core Documentation
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference and endpoint documentation
- **[Authentication](./AUTHENTICATION.md)** - Authentication system implementation and usage
- **[Test Suite](./TEST_SUITE.md)** - Testing strategy and test documentation

### Feature Documentation
- **[Conversation System Requirements](./CONVERSATION_SYSTEM_REQUIREMENTS.md)** - Requirements and implementation plan for the conversation and message system
- **[Rendering Pipeline](./RENDERING_PIPELINE.md)** - Headless rendering pipeline and security
- **[Chained Generation Pipeline](./CHAINED_GENERATION_PIPELINE.md)** - Domain-agnostic, fast, parallel scene generation architecture

## Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and setup instructions
- [Environment Setup](../env.example) - Environment variables configuration

### Development
- [Source Code](../src/) - Application source code
- [Database Schema](../prisma/schema.prisma) - Database models and relationships
- [Package Configuration](../package.json) - Dependencies and scripts

## Contributing

When adding new documentation:
1. Place feature-specific docs in this `docs/` directory
2. Update this index file to include new documentation
3. Follow the existing documentation format and structure
4. Include code examples and clear explanations

## Documentation Standards

- Use clear, descriptive file names
- Include code examples where appropriate
- Keep documentation up to date with code changes
- Use markdown formatting consistently
- Include links to related documentation 