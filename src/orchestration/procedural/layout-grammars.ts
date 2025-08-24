// Layout Grammar Engine - Deterministic positioning algorithms
// Maps archetypes to specific layout strategies for consistent visual composition

import { TOKENS } from './tokens';
import { ThemePack } from './tokens';
import { CanvasElement, CanvasGroup, LineOptions } from '../../types/canvas';
import { Entity, Relation } from '../pipeline/types';

// Layout result structure
export interface LayoutResult {
  elements: CanvasElement[];
  groups: CanvasGroup[];
  edges: Array<{
    from: string;
    to: string;
    lineOptions: LineOptions;
  }>;
}

// Entity positioning data
interface EntityPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  role: string;
}

// Edge routing data (unused for now, but kept for future use)
// interface EdgeRoute {
//   from: string;
//   to: string;
//   start: { x: number; y: number };
//   end: { x: number; y: number };
//   controlPoint?: { x: number; y: number };
// }

export class LayoutGrammarEngine {
  private theme: ThemePack;
  private tokens: typeof TOKENS;

  constructor(theme: ThemePack) {
    this.theme = theme;
    this.tokens = TOKENS;
  }

  // Main layout generation method
  generateLayout(archetype: string, entities: Entity[], relations: Relation[]): LayoutResult {
    switch (archetype) {
      case 'process_flow':
        return this.layoutProcessFlow(entities, relations);
      case 'timeline_sequence':
        return this.layoutTimeline(entities, relations);
      case 'hierarchy_parts':
        return this.layoutHierarchy(entities, relations);
      case 'comparison_tradeoff':
        return this.layoutComparison(entities, relations);
      case 'map_topology':
        return this.layoutTopology(entities, relations);
      case 'cause_effect':
        return this.layoutCauseEffect(entities, relations);
      case 'algorithm_trace':
        return this.layoutAlgorithmTrace(entities, relations);
      case 'lifecycle_cycle':
        return this.layoutLifecycle(entities, relations);
      default:
        return this.layoutDefault(entities, relations);
    }
  }

  // Process flow layout - horizontal left-to-right progression
  private layoutProcessFlow(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createHorizontalLanes(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Timeline sequence layout - vertical top-to-bottom progression
  private layoutTimeline(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createVerticalLanes(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Hierarchy layout - tree structure with parent-child relationships
  private layoutHierarchy(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createHierarchicalLayout(entities, relations);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Comparison layout - side-by-side comparison with center divider
  private layoutComparison(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createComparisonLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Topology layout - network/graph structure
  private layoutTopology(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createTopologyLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Cause-effect layout - left-to-right with emphasis on causality
  private layoutCauseEffect(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createCauseEffectLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Algorithm trace layout - step-by-step execution flow
  private layoutAlgorithmTrace(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createAlgorithmTraceLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Lifecycle layout - circular or spiral progression
  private layoutLifecycle(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createLifecycleLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Default layout - fallback grid arrangement
  private layoutDefault(entities: Entity[], relations: Relation[]): LayoutResult {
    const positions = this.createGridLayout(entities);
    const elements = this.createElements(entities, positions);
    const groups = this.createGroups();
    const edges = this.routeEdges(relations, positions);

    return { elements, groups, edges };
  }

  // Horizontal lane creation for process flows
  private createHorizontalLanes(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const laneCount = Math.min(entities.length, 5); // Max 5 lanes
    const laneWidth = (1280 - 2 * this.tokens.grid.margin) / laneCount;
    
    entities.forEach((entity, index) => {
      const lane = index % laneCount;
      const row = Math.floor(index / laneCount);
      
      const x = this.snapToGrid(this.tokens.grid.margin + lane * laneWidth + laneWidth / 2);
      const y = this.snapToGrid(this.tokens.grid.margin + row * this.tokens.grid.laneGap + this.tokens.grid.laneGap / 2);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Vertical lane creation for timelines
  private createVerticalLanes(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const laneCount = Math.min(entities.length, 4); // Max 4 lanes
    const laneHeight = (720 - 2 * this.tokens.grid.margin) / laneCount;
    
    entities.forEach((entity, index) => {
      const lane = index % laneCount;
      const col = Math.floor(index / laneCount);
      
      const x = this.snapToGrid(this.tokens.grid.margin + col * this.tokens.grid.laneGap + this.tokens.grid.laneGap / 2);
      const y = this.snapToGrid(this.tokens.grid.margin + lane * laneHeight + laneHeight / 2);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Hierarchical layout for tree structures
  private createHierarchicalLayout(entities: Entity[], relations: Relation[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const levels = this.buildHierarchyLevels(entities, relations);
    
    levels.forEach((levelEntities, levelIndex) => {
      const levelWidth = (1280 - 2 * this.tokens.grid.margin) / Math.max(levelEntities.length, 1);
      
      levelEntities.forEach((entity, entityIndex) => {
        const x = this.snapToGrid(this.tokens.grid.margin + entityIndex * levelWidth + levelWidth / 2);
        const y = this.snapToGrid(this.tokens.grid.margin + levelIndex * this.tokens.grid.laneGap);
        
        positions.push({
          id: entity.id,
          x,
          y,
          width: 120,
          height: 80,
          role: this.determineRole(entity.type)
        });
      });
    });

    return positions;
  }

  // Comparison layout for side-by-side analysis
  private createComparisonLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const centerX = 1280 / 2;
    const leftStart = this.tokens.grid.margin;
    const rightStart = centerX + this.tokens.grid.margin;
    const laneWidth = (centerX - 2 * this.tokens.grid.margin) / 2;
    
    entities.forEach((entity, index) => {
      const isLeft = index % 2 === 0;
      const row = Math.floor(index / 2);
      
      const x = this.snapToGrid(
        isLeft 
          ? leftStart + laneWidth / 2 
          : rightStart + laneWidth / 2
      );
      const y = this.snapToGrid(this.tokens.grid.margin + row * this.tokens.grid.laneGap);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Topology layout for network structures
  private createTopologyLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const centerX = 1280 / 2;
    const centerY = 720 / 2;
    const radius = Math.min(1280, 720) / 3;
    
    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      const x = this.snapToGrid(centerX + Math.cos(angle) * radius);
      const y = this.snapToGrid(centerY + Math.sin(angle) * radius);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Cause-effect layout emphasizing causality
  private createCauseEffectLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const causeEntities = entities.filter(e => e.type === 'event' || e.type === 'process');
    const effectEntities = entities.filter(e => e.type === 'container' || e.type === 'actor');
    
    // Position cause entities on the left
    causeEntities.forEach((entity, index) => {
      const x = this.snapToGrid(this.tokens.grid.margin + index * this.tokens.grid.laneGap);
      const y = this.snapToGrid(this.tokens.grid.margin + this.tokens.grid.laneGap);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });
    
    // Position effect entities on the right
    effectEntities.forEach((entity, index) => {
      const x = this.snapToGrid(1280 - this.tokens.grid.margin - index * this.tokens.grid.laneGap);
      const y = this.snapToGrid(this.tokens.grid.margin + this.tokens.grid.laneGap);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Algorithm trace layout for step-by-step execution
  private createAlgorithmTraceLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const stepEntities = entities.filter(e => e.type === 'process');
    const dataEntities = entities.filter(e => e.type === 'container' || e.type === 'event');
    
    // Position step entities in a vertical flow
    stepEntities.forEach((entity, index) => {
      const x = this.snapToGrid(1280 / 2);
      const y = this.snapToGrid(this.tokens.grid.margin + index * this.tokens.grid.laneGap);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });
    
    // Position data entities to the sides
    dataEntities.forEach((entity, index) => {
      const isLeft = index % 2 === 0;
      const x = this.snapToGrid(
        isLeft 
          ? this.tokens.grid.margin + this.tokens.grid.laneGap
          : 1280 - this.tokens.grid.margin - this.tokens.grid.laneGap
      );
      const y = this.snapToGrid(this.tokens.grid.margin + Math.floor(index / 2) * this.tokens.grid.laneGap);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Lifecycle layout for circular progression
  private createLifecycleLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const centerX = 1280 / 2;
    const centerY = 720 / 2;
    const radius = Math.min(1280, 720) / 4;
    
    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI - Math.PI / 2; // Start from top
      const x = this.snapToGrid(centerX + Math.cos(angle) * radius);
      const y = this.snapToGrid(centerY + Math.sin(angle) * radius);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Grid layout fallback
  private createGridLayout(entities: Entity[]): EntityPosition[] {
    const positions: EntityPosition[] = [];
    const cols = Math.ceil(Math.sqrt(entities.length));
    const rows = Math.ceil(entities.length / cols);
    const cellWidth = (1280 - 2 * this.tokens.grid.margin) / cols;
    const cellHeight = (720 - 2 * this.tokens.grid.margin) / rows;
    
    entities.forEach((entity, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = this.snapToGrid(this.tokens.grid.margin + col * cellWidth + cellWidth / 2);
      const y = this.snapToGrid(this.tokens.grid.margin + row * cellHeight + cellHeight / 2);
      
      positions.push({
        id: entity.id,
        x,
        y,
        width: 120,
        height: 80,
        role: this.determineRole(entity.type)
      });
    });

    return positions;
  }

  // Create canvas elements from positioned entities
  private createElements(entities: Entity[], positions: EntityPosition[]): CanvasElement[] {
    return positions.map(pos => {
      const entity = entities.find(e => e.id === pos.id);
      if (!entity) throw new Error(`Entity ${pos.id} not found`);
      
      return {
        id: pos.id,
        name: entity.label,
        type: this.determineElementType(entity.type),
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        fill: "#F1F5F9", // Will be resolved by style resolver
        stroke: "#64748B",
        strokeWidth: 2,
        cornerRadius: 6,
        opacity: 1,
        visible: true,
        zIndex: 1,
        animations: []
      };
    });
  }

  // Create canvas groups
  private createGroups(): CanvasGroup[] {
    // For now, create minimal groups - can be enhanced later
    return [];
  }

  // Route edges between entities
  private routeEdges(relations: Relation[], positions: EntityPosition[]): Array<{
    from: string;
    to: string;
    lineOptions: LineOptions;
  }> {
    return relations.map(relation => {
      const fromPos = positions.find(p => p.id === relation.from);
      const toPos = positions.find(p => p.id === relation.to);
      
      if (!fromPos || !toPos) {
        throw new Error(`Position not found for relation ${relation.from} -> ${relation.to}`);
      }
      
      const start = { x: fromPos.x + fromPos.width / 2, y: fromPos.y + fromPos.height / 2 };
      const end = { x: toPos.x + toPos.width / 2, y: toPos.y + toPos.height / 2 };
      
      // Calculate control point for curved edges
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const offset = 24 * (this.theme.motion.speedFactor || 1);
      const controlPoint = { x: midX, y: midY + offset };
      
      return {
        from: relation.from,
        to: relation.to,
        lineOptions: {
          points: { start, end },
          controlPoint,
          arrow: true,
          dotted: false,
          isCurved: true
        }
      };
    });
  }

  // Utility methods
  private snapToGrid(value: number): number {
    return Math.round(value / this.tokens.grid.snap) * this.tokens.grid.snap;
  }

  private determineRole(entityType: string): string {
    switch (entityType) {
      case 'actor': return 'actor.card';
      case 'process': return 'process.node';
      case 'container': return 'container.card';
      case 'event': return 'event.node';
      case 'channel': return 'channel.node';
      default: return 'container.card';
    }
  }

  private determineElementType(entityType: string): "rectangle" | "circle" | "text" | "polygon" {
    switch (entityType) {
      case 'actor': return 'rectangle';
      case 'process': return 'rectangle';
      case 'container': return 'rectangle';
      case 'event': return 'circle';
      case 'channel': return 'rectangle';
      default: return 'rectangle';
    }
  }

  // Note: findRootEntities is kept for future use but not currently used

  private buildHierarchyLevels(entities: Entity[], relations: Relation[]): Entity[][] {
    const levels: Entity[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();
    
    // Initialize in-degree counts
    entities.forEach(e => inDegree.set(e.id, 0));
    relations.forEach(r => {
      inDegree.set(r.to, (inDegree.get(r.to) || 0) + 1);
    });
    
    // Find root nodes (in-degree = 0)
    let currentLevel = entities.filter(e => inDegree.get(e.id) === 0);
    
    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      currentLevel.forEach(e => visited.add(e.id));
      
      // Find next level
      const nextLevel: Entity[] = [];
      currentLevel.forEach(e => {
        relations
          .filter(r => r.from === e.id)
          .forEach(r => {
            const target = entities.find(e2 => e2.id === r.to);
            if (target && !visited.has(target.id)) {
              inDegree.set(target.id, (inDegree.get(target.id) || 1) - 1);
              if (inDegree.get(target.id) === 0) {
                nextLevel.push(target);
              }
            }
          });
      });
      
      currentLevel = nextLevel;
    }
    
    return levels;
  }
}
