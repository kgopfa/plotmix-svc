// Project data structure types for the separated mainState and configuration approach
// Import canvas types to avoid duplication and conflicts
import { 
  CanvasElement, 
  CanvasGroup, 
  Timeline
} from './canvas';

// Current schema structure - array of scenes with project-level dimensions
export interface ProjectMainState {
  // Project-level dimensions - all scenes share the same canvas size
  dimensions: {
    width: number;
    height: number;
  };
  
  scenes: Array<{
    sceneId: string;
    sceneName: string;
    sceneCanvas: {
      elements: CanvasElement[];
      groups: CanvasGroup[];
      timeline: Timeline;
    };
  }>;
}

export interface ProjectConfiguration {
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
    // Extended snapping configuration
    snapping: {
      grid: {
        enabled: boolean;
        visible: boolean;
        size: number;
        snapThreshold: number;
      };
      elements: {
        enabled: boolean;
        snapThreshold: number;
        showGuides: boolean;
        enableSpacing: boolean;
        enableDistribution: boolean;
      };
    };
  };
  
  // Animation preferences
  animation: {
    playbackRate: number;
    isLooping: boolean;
    autoPlay: boolean;
  };
}

// Re-export canvas types for backward compatibility
export type { 
  CanvasElement, 
  CanvasGroup, 
  Timeline
} from './canvas';

// Legacy type alias for backward compatibility
export type AnimatedCanvasObject = CanvasElement;

// Utility types for database operations
export interface ProjectSaveData {
  mainState: ProjectMainState;
  configuration: ProjectConfiguration;
}

export interface ProjectLoadData {
  mainState: ProjectMainState;
  configuration: ProjectConfiguration | null;
}
