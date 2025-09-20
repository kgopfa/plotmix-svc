import type { Action, ActionProgram } from '../../../types';
import { logger } from '../../../utils/logger';

export class DslCompiler {
  static compile(dsl: string): ActionProgram {
    // Strip markdown fence blocks if present
    const cleanDsl = dsl.replace(/^```dsl\s*\n?/, '').replace(/\n?```$/, '');
    
    // Preprocess pseudocode to escape newlines within triple quotes
    const processedDsl = this.preprocessPseudocode(cleanDsl);
    
    const lines = processedDsl.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const program: Action[] = [];

    for (const line of lines) {
      const action = this.parseLine(line);
      if (action) {
        program.push(action);
      }
    }

    return program;
  }

  private static preprocessPseudocode(dsl: string): string {
    // Replace newlines within triple-quoted pseudocode with escaped newlines
    // This regex matches: pseudocode """...content with newlines..."""
    return dsl.replace(/pseudocode\s+"""([^"]+)"""/g, (_match, content) => {
      // Replace newlines in the content with \n escape sequences
      const escapedContent = content.replace(/\n/g, '\\n');
      return `pseudocode """${escapedContent}"""`;
    });
  }

  private static parseLine(line: string): Action | null {
    const parts = line.split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
      case 'seed':
        return this.parseSeed(parts);
      case 'style':
        return this.parseStyle(parts);
      case 'array':
        return this.parseArray(line);
      case 'animate':
        return this.parseAnimate(line);
      case 'caption':
        return this.parseCaption(line);
      case 'heading':
        return this.parseHeading(line);
      case 'subtitle':
        return this.parseSubtitle(line);
      case 'explanation':
        return this.parseExplanation(line);
      case 'approach':
        return this.parseApproach(line);
      case 'example':
        return this.parseExample(line);
      case 'conclusion':
        return this.parseConclusion(line);
      case 'edgecase':
        return this.parseEdgecase(line);
      case 'alternative':
        return this.parseAlternative(line);
      case 'pseudocode':
        return this.parsePseudocode(line);
      case 'keyidea':
        return this.parseKeyidea(line);
      case 'wait':
        return this.parseWait(line);
      case 'create_pointer':
        return this.parseCreatePointer(line);
      /* case 'goal':
        return this.parseGoal(line); */
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
    // Check for create_pointer command: array create_pointer ["left", "right"]
    const createPointerMatch = line.match(/^array\s+create_pointer\s+\[([^\]]+)\]/);
    if (createPointerMatch) {
      const pointerIds = createPointerMatch[1]!.split(',').map(v => {
        const trimmed = v.trim();
        return trimmed.startsWith('"') && trimmed.endsWith('"') 
          ? trimmed.slice(1, -1) 
          : trimmed;
      });
      
      return {
        kind: "CREATE_POINTERS",
        pointerIds
      };
    }

    // Regular array creation: array [1,2,3,4]
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

  private static parseAnimate(line: string): Action | null {
    // Handle other animations: animate highlight [1,2,3]
    const animateMatch = line.match(/^animate\s+(highlight|select|deselect|focus|compare)\s+\[([^\]]+)\]/);
    
    if (!animateMatch) {
      return null;
    }

    const type = animateMatch[1] as "highlight"|"select"|"deselect"|"focus"|"compare";
    const elementsStr = animateMatch[2]!;

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
      startTime: 0, // Will be calculated automatically by executor
      duration: 2 // Default duration
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

  private static parseHeading(line: string): Action | null {
    const headingMatch = line.match(/^heading\s+"([^"]+)"/);
    
    if (!headingMatch) {
      return null;
    }

    const text = headingMatch[1]!;

    return {
      kind: "HEADING",
      text
    };
  }

  private static parseSubtitle(line: string): Action | null {
    // Parse subtitle with optional order and section: subtitle [order] [section] "text"
    const subtitleMatch = line.match(/^subtitle\s+(?:(\d+)\s+)?(?:(\w+)\s+)?\"([^"]+)"/);
    
    if (!subtitleMatch) {
      return null;
    }

    const order = subtitleMatch[1] ? parseInt(subtitleMatch[1], 10) : 1;
    const section = subtitleMatch[2] || undefined;
    const text = subtitleMatch[3]!;

    return {
      kind: "SUBTITLE",
      order,
      text,
      ...(section && { section })
    };
  }

  private static parseExample(line: string): Action | null {
    const exampleMatch = line.match(/^example\s+"([^"]+)"/);
    
    if (!exampleMatch) {
      return null;
    }

    const text = exampleMatch[1]!;

    return {
      kind: "EXAMPLE",
      text
    };
  }

  private static parseExplanation(line: string): Action | null {
    const explanationMatch = line.match(/^explanation\s+(\d+)\s+"([^"]+)"/);
    
    if (!explanationMatch) {
      return null;
    }

    const order = parseInt(explanationMatch[1]!);
    const text = explanationMatch[2]!;

    return {
      kind: "EXPLANATION",
      order,
      text
    };
  }

  private static parseApproach(line: string): Action | null {
    // Parse: approach 1 "Binary search is implemented using 2 boundary pointers, start and end"
    const approachMatch = line.match(/^approach\s+(\d+)\s+"([^"]+)"/);
    
    if (!approachMatch) {
      return null;
    }

    const order = parseInt(approachMatch[1]!);
    const text = approachMatch[2]!;

    return {
      kind: "APPROACH",
      order,
      text
    };
  }

  private static parseConclusion(line: string): Action | null {
    // Parse: conclusion 1 "Time Complexity: O(log n)"
    const conclusionMatch = line.match(/^conclusion\s+(\d+)\s+"([^"]+)"/);
    if (!conclusionMatch) {
      return null;
    }
    
    const order = parseInt(conclusionMatch[1]!);
    const text = conclusionMatch[2]!;
    
    return {
      kind: "CONCLUSION",
      order,
      text
    };
  }

  private static parseEdgecase(line: string): Action | null {
    // Parse: edgecase 1 "Empty array."
    const edgecaseMatch = line.match(/^edgecase\s+(\d+)\s+"([^"]+)"/);
    if (!edgecaseMatch) {
      return null;
    }
    
    const order = parseInt(edgecaseMatch[1]!);
    const text = edgecaseMatch[2]!;
    
    return {
      kind: "EDGECASE",
      order,
      text
    };
  }

  private static parseAlternative(line: string): Action | null {
    // Parse: alternative 1 "Linear Search — Checks each element sequentially until the target is found or the end of the array is reached. (Time: O(n), Space: O(1))"
    const alternativeMatch = line.match(/^alternative\s+(\d+)\s+"([^"]+)"/);
    if (!alternativeMatch) {
      return null;
    }
    
    const order = parseInt(alternativeMatch[1]!);
    const text = alternativeMatch[2]!;
    
    return {
      kind: "ALTERNATIVE",
      order,
      text
    };
  }

  private static parsePseudocode(line: string): Action | null {
    // Parse: pseudocode "multi-line text"
    // This handles multi-line text enclosed in triple quotes or similar
    const pseudocodeMatch = line.match(/^pseudocode\s+"""([^"]+)"""/);
    if (!pseudocodeMatch) {
      // Fallback to single quotes if triple quotes not found
      const fallbackMatch = line.match(/^pseudocode\s+"([^"]+)"/);
      if (!fallbackMatch) {
        return null;
      }
      return {
        kind: "PSEUDOCODE",
        text: fallbackMatch[1]!.replace(/\\n/g, '\n')
      };
    }
    
    const text = pseudocodeMatch[1]!.replace(/\\n/g, '\n');
    
    return {
      kind: "PSEUDOCODE",
      text
    };
  }

  private static parseKeyidea(line: string): Action | null {
    // Parse: keyidea 1 "Requires a sorted array."
    const keyideaMatch = line.match(/^keyidea\s+(\d+)\s+"([^"]+)"/);
    if (!keyideaMatch) {
      return null;
    }
    
    const order = parseInt(keyideaMatch[1]!);
    const text = keyideaMatch[2]!;
    
    return {
      kind: "KEYIDEA",
      order,
      text
    };
  }

  private static parseWait(line: string): Action | null {
    // Parse: wait 5 (wait for 5 seconds)
    const waitMatch = line.match(/^wait\s+(\d+(?:\.\d+)?)/);
    if (!waitMatch) {
      return null;
    }
    
    const duration = parseFloat(waitMatch[1]!);
    
    return {
      kind: "WAIT",
      duration
    };
  }

  /*
  private static parseGoal(line: string): Action | null {
    // Parse: goal "Demonstrate how binary search efficiently finds a target in a sorted array."
    const goalMatch = line.match(/^goal\s+"([^"]+)"/);
    if (!goalMatch) {
      return null;
    }
    
    const text = goalMatch[1]!;
    
    // For now, treat goal as an example since it's similar content
    return {
      kind: "EXAMPLE",
      text
    };
  }
  */

  private static parseCreatePointer(line: string): Action | null {
    const createPointerMatch = line.match(/^create_pointer\s+\[([^\]]+)\]/);
    
    if (!createPointerMatch) {
      return null;
    }
    
    const pointerIds = createPointerMatch[1]!.split(',').map(v => {
      const trimmed = v.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"') 
        ? trimmed.slice(1, -1) 
        : trimmed;
    });
    
    return {
      kind: "CREATE_POINTERS",
      pointerIds
    };
  }
}
