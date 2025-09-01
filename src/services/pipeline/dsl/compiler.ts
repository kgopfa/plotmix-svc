import type { Action, ActionProgram } from '../../../types';
import { logger } from '../../../utils/logger';

export class DslCompiler {
  static compile(dsl: string): ActionProgram {
    // Strip markdown fence blocks if present
    const cleanDsl = dsl.replace(/^```dsl\s*\n?/, '').replace(/\n?```$/, '');
    
    const lines = cleanDsl.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const program: Action[] = [];

    for (const line of lines) {
      const action = this.parseLine(line);
      if (action) {
        program.push(action);
      }
    }

    return program;
  }

  private static parseLine(line: string): Action | null {
    const parts = line.split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
      case 'seed':
        return this.parseSeed(parts);
      case 'style':
        return this.parseStyle(parts);
              // Text commands removed - only arrays and captions supported
      case 'array':
        return this.parseArray(line);
      case 'animate':
        return this.parseAnimate(line);
      case 'caption':
        return this.parseCaption(line);
      default:
        logger.error(`Unknown DSL command: ${command}`);
        throw new Error(`Unknown DSL command: ${command}`);
    }
  }

  private static parseSeed(parts: string[]): Action | null {
    if (parts.length < 2) return null;
    const seed = parseInt(parts[1]!);
    if (isNaN(seed)) return null;
    
    return {
      kind: "SETUP",
      seed,
      style: "auto"
    };
  }

  private static parseStyle(parts: string[]): Action | null {
    if (parts.length < 2) return null;
    const style = parts[1]!;
    
    return {
      kind: "SETUP",
      seed: 0, // will be overridden by actual seed command
      style: style === "auto" ? "auto" : style
    };
  }

  private static parseArray(line: string): Action | null {
    const valuesMatch = line.match(/^array\s+\[([^\]]+)\]/);
    const gapMatch = line.match(/gap\s+(\d+)/);
    const cellMatch = line.match(/cell\s+(\d+)/);

    if (!valuesMatch) {
      return null;
    }

    const values = valuesMatch[1]!.split(',').map(v => {
      const trimmed = v.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"') 
        ? trimmed.slice(1, -1) 
        : isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
    });

    const gap = gapMatch ? parseInt(gapMatch[1]!) : undefined;
    const cell = cellMatch ? parseInt(cellMatch[1]!) : undefined;

    return { 
      kind: "DRAW_ARRAY", 
      values, 
      ...(gap !== undefined && { gap }),
      ...(cell !== undefined && { cell })
    };
  }

  // Text commands removed - only arrays and captions supported

  private static parseAnimate(line: string): Action | null {
    const animateMatch = line.match(/^animate\s+(highlight|select|focus|compare)\s+\[([^\]]+)\]\s+(\d+)\s+(\d+)/);
    
    if (!animateMatch) {
      return null;
    }

    const type = animateMatch[1] as "highlight"|"select"|"focus"|"compare";
    const elementsStr = animateMatch[2]!;
    const startTime = parseInt(animateMatch[3]!);
    const duration = parseInt(animateMatch[4]!);

    const elements = elementsStr.split(',').map(v => {
      const trimmed = v.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"') 
        ? trimmed.slice(1, -1) 
        : isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
    });

    return {
      kind: "ANIMATE",
      type,
      elements,
      startTime,
      duration
    };
  }

  private static parseCaption(line: string): Action | null {
    const captionMatch = line.match(/^caption\s+(\d+)\s+"([^"]+)"/);
    
    if (!captionMatch) {
      return null;
    }

    const order = parseInt(captionMatch[1]!);
    const text = captionMatch[2]!;

    return {
      kind: "CAPTION",
      order,
      text
    };
  }
}
