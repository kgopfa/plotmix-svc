# Current Schema Documentation

## Overview

The PlotMix engine uses a multi-scene array-based structure for `mainState`. This document outlines the current schema format and implementation details.

## Current Schema Structure

### Multi-Scene Array Structure
```json
{
  "name": "project-name",
  "title": "Project Title", 
  "description": "Project description",
  "mainState": {
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "scenes": [
      {
        "sceneId": "scene-1",
        "sceneName": "Scene 1",
        "sceneCanvas": {
          "elements": [...],
          "groups": [...],
          "timeline": {...}
        }
      },
      {
        "sceneId": "scene-2", 
        "sceneName": "Scene 2",
        "sceneCanvas": {
          "elements": [...],
          "groups": [...],
          "timeline": {...}
        }
      }
    ]
  }
}
```

## Schema Details

### Project-Level Properties
- **dimensions**: Canvas dimensions shared across all scenes
  - **width**: Canvas width in pixels (e.g., 1920)
  - **height**: Canvas height in pixels (e.g., 1080)

### Scene Object Structure
- **sceneId**: Unique identifier for the scene (string)
- **sceneName**: Human-readable name for the scene (string)
- **sceneCanvas**: Contains the canvas structure for this scene
  - **elements**: Array of `AnimatedCanvasObject[]`
  - **groups**: Array of `CanvasGroup[]`
  - **timeline**: Timeline configuration object

### Canvas Structure
The internal canvas structure remains the same:
- Elements maintain all existing properties
- Groups maintain all existing properties  
- Timeline maintains all existing properties
- All animation and styling rules remain unchanged

## Implementation Status

### ✅ Completed Updates

1. **Type Definitions** (`src/types/project.ts`)
   - Updated `ProjectMainState` interface to use array structure
   - Added project-level dimensions
   - Removed all legacy support

2. **Sanitize Utility** (`src/utils/sanitize.ts`)
   - Updated to handle multi-scene array format
   - Removed legacy schema checks

3. **Pipeline Validation** (`src/schema/pipeline-validation.ts`)
   - Updated validation schema to expect new structure

4. **LangGraph Types** (`src/orchestration/langgraph/types.ts`)
   - Updated mainState type definition

5. **Pipeline Generation Service** (`src/services/pipeline-generation.service.ts`)
   - Updated to output new schema format
   - Fixed validation and logging for new structure

6. **Project Service** (`src/services/project.service.ts`)
   - Updated `applyProjectChange` method for new format
   - Removed legacy schema support
   - Always maintains new schema format

7. **Orchestration Service** (`src/services/orchestration.service.ts`)
   - Updated `normalizeAndValidateMainState` for new format
   - Removed legacy schema support

8. **Pipeline Runner** (`src/orchestration/pipeline-runner.ts`)
   - Updated to output new schema format

9. **Test Scripts** (`src/scripts/test-pipeline.ts`)
   - Updated to handle new schema structure

### 🔄 Files NOT Requiring Updates
- **OpenAI Generation Service**: `src/services/openai-generation.service.ts` (being deprecated)

## Schema Format

### Single Scene (Default)
Most projects will use a single scene:
```json
{
  "mainState": {
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "scenes": [
      {
        "sceneId": "default-scene",
        "sceneName": "Default Scene",
        "sceneCanvas": {
          "elements": [...],
          "groups": [...],
          "timeline": {...}
        }
      }
    ]
  }
}
```

### Multiple Scenes
For complex projects with multiple scenes:
```json
{
  "mainState": {
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "scenes": [
      {
        "sceneId": "intro-scene",
        "sceneName": "Introduction",
        "sceneCanvas": { ... }
      },
      {
        "sceneId": "main-scene", 
        "sceneName": "Main Content",
        "sceneCanvas": { ... }
      },
      {
        "sceneId": "conclusion-scene",
        "sceneName": "Conclusion", 
        "sceneCanvas": { ... }
      }
    ]
  }
}
```

## Benefits

1. **Scalability**: Support for multiple scenes in a single project
2. **Organization**: Better structure for complex animations
3. **Consistency**: All projects use the same schema format
4. **Dimensions**: Project-level canvas sizing for consistency across scenes

## Testing Considerations

- ✅ Test single scene projects
- ✅ Test multi-scene projects  
- ✅ Verify scene iteration works correctly
- ✅ Ensure animations work across multiple scenes
- ✅ Validate schema format compliance

## Future Considerations

This schema structure provides a foundation for:
- Scene transitions and relationships
- Scene-level metadata and configuration
- Advanced scene management features
- Inter-scene animations and effects
