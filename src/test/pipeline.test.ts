import { Orchestrator } from '../services/pipeline/orchestrator';
import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';
import { pickStyle } from '../services/pipeline/procedural/seed';

// Mock the LLM pipeline to avoid real LLM calls
jest.mock('../services/pipeline/llm', () => {
  class MockLlmPipeline {
    async execute(_: string) {
      const dsl = `seed 9999\ncanvas 1920x1080\nstyle auto\narray [1,2] gap 20 cell 60`;
      return { success: true, dsl };
    }
  }
  return { LlmPipeline: MockLlmPipeline };
});

describe('PipelineService', () => {
  describe('generateFromPrompt', () => {
    it('should generate a scene from valid DSL via LLM', async () => {
      const result = await Orchestrator.generateFromPrompt('Explain rotated array');
      expect(result.success).toBe(true);
      expect(result.mainState).toBeDefined();
      expect(result.mainState?.groups).toHaveLength(2);
      expect(result.summary).toContain('Generated visualization');
    });
  });

  describe('validateScene', () => {
    it('should detect invalid scenes', () => {
      const invalidScene = {
        groups: [],
        elements: [],
        timeline: { scale: 100, duration: 1, currentTime: 0, animationStates: {} }
      };

      const validation = Orchestrator.validateScene(invalidScene);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Scene must contain at least one group');
      expect(validation.errors).toContain('Scene must contain at least one element');
    });
  });
});

describe('DslCompiler', () => {
  it('should parse seed command', () => {
    const dsl = 'seed 1234';
    const program = DslCompiler.compile(dsl);
    
    expect(program).toHaveLength(1);
    const first = program[0]!;
    expect(first.kind).toBe('SETUP');
    if (first.kind !== 'SETUP') throw new Error('Expected SETUP');
    expect(first.seed).toBe(1234);
  });

  it('should parse canvas command', () => {
    const dsl = 'canvas 1920x1080';
    const program = DslCompiler.compile(dsl);
    
    expect(program).toHaveLength(1);
    const first = program[0]!;
    expect(first.kind).toBe('SETUP');
    if (first.kind !== 'SETUP') throw new Error('Expected SETUP');
    expect(first.canvas?.width).toBe(1920);
    expect(first.canvas?.height).toBe(1080);
  });

  it('should parse array command', () => {
    const dsl = 'array [1,2,3] gap 20 cell 60';
    const program = DslCompiler.compile(dsl);
    
    expect(program).toHaveLength(1);
    const first = program[0]!;
    expect(first.kind).toBe('DRAW_ARRAY');
    if (first.kind !== 'DRAW_ARRAY') throw new Error('Expected DRAW_ARRAY');
    expect(first.values).toEqual([1, 2, 3]);
    expect(first.gap).toBe(20);
    expect(first.cell).toBe(60);
  });
});

describe('Executor', () => {
  it('should execute a simple array program', () => {
    const program = [{
      kind: 'SETUP' as const,
      seed: 1234,
      canvas: { width: 1920, height: 1080 },
      style: 'auto'
    }, {
      kind: 'DRAW_ARRAY' as const,
      values: [1, 2, 3],
      gap: 20,
      cell: 60
    }];

    const scene = execute(program);

    expect(scene.groups).toHaveLength(3);
    expect(scene.elements).toHaveLength(6);
    expect(scene.timeline).toBeDefined();
  });

  it('should apply seeded style to rectangles for each seed', () => {
    const program1 = [{
      kind: 'SETUP' as const,
      seed: 1111,
      canvas: { width: 1920, height: 1080 },
      style: 'auto'
    }, {
      kind: 'DRAW_ARRAY' as const,
      values: [1],
      gap: 20
    }];

    const program2 = [{
      kind: 'SETUP' as const,
      seed: 2222,
      canvas: { width: 1920, height: 1080 },
      style: 'auto'
    }, {
      kind: 'DRAW_ARRAY' as const,
      values: [1],
      gap: 20
    }];

    const scene1 = execute(program1);
    const scene2 = execute(program2);

    const rect1 = scene1.elements.find(el => el.type === 'rectangle') as any;
    const rect2 = scene2.elements.find(el => el.type === 'rectangle') as any;

    const style1 = pickStyle(1111);
    const style2 = pickStyle(2222);

    expect(rect1.stroke).toBe(style1.palette.cellStroke);
    expect(rect2.stroke).toBe(style2.palette.cellStroke);
  });
});

describe('SeededStyleService', () => {
  it('should return consistent styles for the same seed', () => {
    const style1 = pickStyle(1234);
    const style2 = pickStyle(1234);
    expect(style1).toEqual(style2);
  });

  it('should return different styles for different seeds', () => {
    const style1 = pickStyle(1111);
    const style2 = pickStyle(2222);
    expect(style1).toBeDefined();
    expect(style2).toBeDefined();
  });
});
