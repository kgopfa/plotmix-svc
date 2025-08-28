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
      case 'text':
        return this.parseText(line);
      case 'array':
        return this.parseArray(line);
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

  private static parseText(line: string): Action | null {
    const textMatch = line.match(/^text\s+"([^"]+)"/);
    const widthMatch = line.match(/width\s+(\d+)/);
    const sizeMatch = line.match(/size\s+(\d+)/);
    const weightMatch = line.match(/weight\s+(\d+)/);
    const alignMatch = line.match(/align\s+(left|center|right)/);

    if (!textMatch) {
      return null;
    }

    const text = textMatch[1]!;
    const width = widthMatch ? parseInt(widthMatch[1]!) : undefined;
    const size = sizeMatch ? parseInt(sizeMatch[1]!) : undefined;
    const weight = weightMatch ? parseInt(weightMatch[1]!) : undefined;
    const align = alignMatch ? alignMatch[1] as "left"|"center"|"right" : undefined;

    return { 
      kind: "DRAW_TEXT", 
      text, 
      ...(width !== undefined && { width }),
      ...(size !== undefined && { size }),
      ...(weight !== undefined && { weight }),
      ...(align !== undefined && { align })
    };
  }
}
