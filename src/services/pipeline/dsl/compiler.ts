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
      case 'canvas':
        return this.parseCanvas(parts);
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
      canvas: { width: 1920, height: 1080 }, // high-res default
      style: "auto"
    };
  }

  private static parseCanvas(parts: string[]): Action | null {
    if (parts.length < 2) return null;
    const canvasStr = parts[1]!;
    const match = canvasStr.match(/^(\d+)x(\d+)$/);
    if (!match) return null;
    
    const width = parseInt(match[1]!);
    const height = parseInt(match[2]!);
    
    return {
      kind: "SETUP",
      seed: 0, // will be overridden by actual seed command
      canvas: { width, height },
      style: "auto"
    };
  }

  private static parseStyle(parts: string[]): Action | null {
    if (parts.length < 2) return null;
    const style = parts[1]!;
    
    return {
      kind: "SETUP",
      seed: 0, // will be overridden by actual seed command
      canvas: { width: 1920, height: 1080 }, // high-res default
      style: style === "auto" ? "auto" : style
    };
  }

  /*
  private static parseStyle(parts: string[]): Action | null {
    if (parts.length < 2) return null;
    const style = parts[1]!;
    
    return {
      kind: "SETUP",
      seed: 0, // will be overridden by actual seed command
      canvas: { width: 1920, height: 1080 }, // high-res default
      style: style === "auto" ? "auto" : style
    };
  }

  private static parseText(line: string): Action | null {
    // text at (-900,-60) w 900 size 36 weight 700 align left "Problem Understanding"
    const atMatch = line.match(/at\s*\(([^)]+)\)/);
    const wMatch = line.match(/w\s+(\d+)/);
    const sizeMatch = line.match(/size\s+(\d+)/);
    const weightMatch = line.match(/weight\s+(\d+)/);
    const alignMatch = line.match(/align\s+(left|center|right)/);
    const contentMatch = line.match(/"([^"]+)"/);

    if (!atMatch || !contentMatch) return null;

    const coords = atMatch[1]!.split(',').map(v => parseInt(v.trim()));
    const x = coords[0];
    const y = coords[1];
    const width = wMatch ? parseInt(wMatch[1]!) : 600;
    const size = sizeMatch ? parseInt(sizeMatch[1]!) : 28;
    const weight = weightMatch ? parseInt(weightMatch[1]!) : 600;
    const align = alignMatch ? alignMatch[1] as "left"|"center"|"right" : "left";

    if (x === undefined || y === undefined || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(size) || isNaN(weight)) return null;

    return {
      kind: "DRAW_TEXT",
      text: contentMatch[1]!,
      at: { x, y },
      width,
      size,
      weight,
      align
    };
  }
  */

  private static parseArray(line: string): Action | null {
    const valuesMatch = line.match(/^array\s+\[([^\]]+)\]/);
    const gapMatch = line.match(/gap\s+(\d+)/);
    const cellMatch = line.match(/cell\s+(\d+)/);
    const gridMatch = line.match(/grid\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);

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
    
    let gridPosition: any = undefined;
    if (gridMatch) {
      const colStart = gridMatch[1]!;
      const colSpan = gridMatch[2]!;
      const rowStart = gridMatch[3]!;
      const rowSpan = gridMatch[4]!;
      gridPosition = {
        colStart: parseInt(colStart),
        colSpan: parseInt(colSpan),
        rowStart: parseInt(rowStart),
        rowSpan: parseInt(rowSpan)
      };
    }

    return { 
      kind: "DRAW_ARRAY", 
      values, 
      ...(gap !== undefined && { gap }),
      ...(cell !== undefined && { cell }),
      ...(gridPosition && { gridPosition })
    };
  }

  private static parseText(line: string): Action | null {
    const textMatch = line.match(/^text\s+"([^"]+)"/);
    const widthMatch = line.match(/width\s+(\d+)/);
    const sizeMatch = line.match(/size\s+(\d+)/);
    const weightMatch = line.match(/weight\s+(\d+)/);
    const alignMatch = line.match(/align\s+(left|center|right)/);
    const gridMatch = line.match(/grid\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);

    if (!textMatch) {
      return null;
    }

    const text = textMatch[1]!;
    const width = widthMatch ? parseInt(widthMatch[1]!) : undefined;
    const size = sizeMatch ? parseInt(sizeMatch[1]!) : undefined;
    const weight = weightMatch ? parseInt(weightMatch[1]!) : undefined;
    const align = alignMatch ? alignMatch[1] as "left"|"center"|"right" : undefined;
    
    let gridPosition: any = undefined;
    if (gridMatch) {
      const colStart = gridMatch[1]!;
      const colSpan = gridMatch[2]!;
      const rowStart = gridMatch[3]!;
      const rowSpan = gridMatch[4]!;
      gridPosition = {
        colStart: parseInt(colStart),
        colSpan: parseInt(colSpan),
        rowStart: parseInt(rowStart),
        rowSpan: parseInt(rowSpan)
      };
    }

    return { 
      kind: "DRAW_TEXT", 
      text, 
      ...(width !== undefined && { width }),
      ...(size !== undefined && { size }),
      ...(weight !== undefined && { weight }),
      ...(align !== undefined && { align }),
      ...(gridPosition && { gridPosition })
    };
  }
}
