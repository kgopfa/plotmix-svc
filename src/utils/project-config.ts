import { ProjectConfiguration } from '../types/project';

export function createDefaultProjectConfiguration(): ProjectConfiguration {
  return {
    // Canvas size settings
    canvasSize: {
      currentSizeId: 'fhd',
      customSize: null,
    },
    
    // UI state
    ui: {
      zoom: 1,
      selectedElements: [],
      selectedGroups: [],
      panelState: {
        leftPanelVisible: true,
        rightPanelVisible: true,
        leftPanelWidth: 384,
        rightPanelWidth: 384,
        timelineHeight: 240,
        isTimelineCollapsed: true,
      },
      toolState: {
        activeTool: 'select',
        isPathMode: false,
        showPaths: true,
      },
    },
    
    // Editor preferences with comprehensive snapping
    editor: {
      snappingEnabled: true,
      gridEnabled: true,
      gridSize: 10,
      showGuides: true,
      snapping: {
        grid: {
          enabled: true,
          visible: true,
          size: 10,
          snapThreshold: 8,
        },
        elements: {
          enabled: true,
          snapThreshold: 10,
          showGuides: true,
          enableSpacing: true,
          enableDistribution: true,
        },
      },
    },
    
    // Animation preferences
    animation: {
      playbackRate: 1,
      isLooping: false,
      autoPlay: false,
    },
  };
}
