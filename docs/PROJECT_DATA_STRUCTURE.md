# Project Data Structure

## Overview

The project data in PlotMix is stored in two separate JSON columns in the `projects` table:

- `mainState`: Contains the core canvas state (elements, groups, animations, timeline)
- `configuration`: Contains UI configuration and settings (resolution, selected shapes, panel states)

This separation allows for better data organization and makes it easier to handle different types of project data independently.

## Data Structure

### mainState Column

The `mainState` column contains the core canvas state that represents the actual content of the project:

```typescript
interface ProjectMainState {
  // Canvas elements and groups
  elements: AnimatedCanvasObject[];
  groups: CanvasGroup[];
  
  // Timeline and animation data
  timeline: {
    scale: number;
    duration: number;
    currentTime: number;
    animationStates: Record<string, AnimationState>;
  };
  
  // Canvas dimensions
  dimensions: {
    width: number;
    height: number;
  };
}
```

#### Elements Structure
```typescript
interface AnimatedCanvasObject {
  id: string;
  name: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'arc' | 'line' | 'path' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  animations: ElementAnimation[];
  groupId?: string;
  parent?: string | null;
  // ... other element-specific properties
}
```

#### Groups Structure
```typescript
interface CanvasGroup {
  id: string;
  name: string;
  elementIds: string[];
  x: number;
  y: number;
  rotation?: number;
  visible?: boolean;
  opacity?: number;
  type: 'text' | 'custom' | 'polygon';
  isDefaultGroup: boolean;
  isAnimationPath?: boolean;
  animations: ElementAnimation[];
  parent?: string | null;
}
```

#### Animation Structure
```typescript
interface ElementAnimation {
  id: string;
  displayName: string;
  type: AnimationType;
  startTime: number;
  duration: number;
  properties: AnimatableProperties;
  easing?: GsapEase;
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  yoyoReturnEasing?: GsapEase;
  stagger?: number;
  staggerFrom?: 'start' | 'end' | 'center';
  staggerEase?: GsapEase;
}
```

### configuration Column

The `configuration` column contains UI settings and preferences that don't affect the core canvas content:

```typescript
interface ProjectConfiguration {
  // Canvas size settings
  canvasSize: {
    currentSizeId: string;
    customSize?: { width: number; height: number } | null;
  };
  
  // UI state
  ui: {
    zoom: number;
    selectedElements: string[];
    selectedGroups: string[];
    panelState: {
      leftPanelVisible: boolean;
      rightPanelVisible: boolean;
      leftPanelWidth: number;
      rightPanelWidth: number;
      timelineHeight: number;
      isTimelineCollapsed: boolean;
    };
    toolState: {
      activeTool: string;
      isPathMode: boolean;
      showPaths: boolean;
    };
  };
  
  // Editor preferences
  editor: {
    selectedShape?: string;
    snappingEnabled: boolean;
    gridEnabled: boolean;
    gridSize: number;
    showGuides: boolean;
  };
  
  // Animation preferences
  animation: {
    playbackRate: number;
    isLooping: boolean;
    autoPlay: boolean;
  };
}
```

## Usage Examples

### Saving Project Data

```typescript
// Example of saving project with separated state and configuration
const projectData = {
  mainState: {
    elements: [
      {
        id: "rect-1",
        name: "My Rectangle",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: "#ff0000",
        animations: []
      }
    ],
    groups: [],
    timeline: {
      scale: 1,
      duration: 10,
      currentTime: 0,
      animationStates: {}
    },
    dimensions: {
      width: 1920,
      height: 1080
    }
  },
  configuration: {
    canvasSize: {
      currentSizeId: "hd",
      customSize: null
    },
    ui: {
      zoom: 1,
      selectedElements: [],
      selectedGroups: [],
      panelState: {
        leftPanelVisible: true,
        rightPanelVisible: true,
        leftPanelWidth: 250,
        rightPanelWidth: 300,
        timelineHeight: 200,
        isTimelineCollapsed: false
      },
      toolState: {
        activeTool: "select",
        isPathMode: false,
        showPaths: true
      }
    },
    editor: {
      selectedShape: "rectangle",
      snappingEnabled: true,
      gridEnabled: false,
      gridSize: 20,
      showGuides: true
    },
    animation: {
      playbackRate: 1,
      isLooping: false,
      autoPlay: false
    }
  }
};

// Save to database
await prisma.project.create({
  data: {
    name: "My Project",
    mainState: projectData.mainState,
    configuration: projectData.configuration,
    version: "1.0.0",
    userId: "user-id"
  }
});
```

### Loading Project Data

```typescript
// Load project from database
const project = await prisma.project.findUnique({
  where: { id: "project-id" }
});

if (project) {
  const mainState = project.mainState as ProjectMainState;
  const configuration = project.configuration as ProjectConfiguration;
  
  // Use the data in your application
  console.log(`Project has ${mainState.elements.length} elements`);
  console.log(`Canvas size: ${configuration.canvasSize.currentSizeId}`);
}
```

### Updating Specific Parts

```typescript
// Update only the main state (canvas content)
await prisma.project.update({
  where: { id: "project-id" },
  data: {
    mainState: newMainState,
    updatedAt: new Date()
  }
});

// Update only the configuration (UI settings)
await prisma.project.update({
  where: { id: "project-id" },
  data: {
    configuration: newConfiguration,
    updatedAt: new Date()
  }
});
```

## Benefits

1. **Separation of Concerns**: Canvas content is separate from UI preferences
2. **Efficient Updates**: Can update UI settings without touching canvas data
3. **Better Performance**: Smaller updates when only configuration changes
4. **Cleaner Data**: Easier to understand what data belongs where
5. **Version Control**: Can track changes to content vs. settings separately

## Related Documentation

- [Canvas Elements Data Structure](../plotmix-ui/docs/canvas-elements-data-structure.md)
- [Canvas Groups Data Structure](../plotmix-ui/docs/canvas-groups-data-structure.md)
- [Animation Storage System](../plotmix-ui/docs/animation-storage-system.md)
- [Timeline State Management](../plotmix-ui/docs/timeline-state-management.md)
