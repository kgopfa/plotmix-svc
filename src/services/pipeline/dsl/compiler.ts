import type { Action, ActionProgram, JsonAnimationProgram } from '../../../types';
import { logger } from '../../../utils/logger';

export class DslCompiler {
  static compile(jsonInput: string): ActionProgram {
    try {
      const jsonProgram: JsonAnimationProgram = JSON.parse(jsonInput);
      const program: Action[] = [];

      // Handle setup if present
      if (jsonProgram.setup) {
        if (jsonProgram.setup.seed !== undefined) {
          program.push({
            kind: "SETUP",
            seed: jsonProgram.setup.seed,
            style: jsonProgram.setup.style || "auto"
          });
        } else if (jsonProgram.setup.style) {
          program.push({
            kind: "SETUP",
            seed: 0,
            style: jsonProgram.setup.style
          });
        }

        // Handle array setup
        if (jsonProgram.setup.array) {
          const arrayAction: any = {
            kind: "DRAW_ARRAY",
            values: jsonProgram.setup.array.values
          };
          if (jsonProgram.setup.array.gap !== undefined) {
            arrayAction.gap = jsonProgram.setup.array.gap;
          }
          if (jsonProgram.setup.array.cell !== undefined) {
            arrayAction.cell = jsonProgram.setup.array.cell;
          }
          program.push(arrayAction);
        }

        // Handle heading
        if (jsonProgram.setup.heading) {
          program.push({
            kind: "HEADING",
            text: jsonProgram.setup.heading
          });
        }

        // Handle subtitle
        if (jsonProgram.setup.subtitle) {
          program.push({
            kind: "SUBTITLE",
            order: 1,
            text: jsonProgram.setup.subtitle
          });
        }
      }

      // Convert each step to corresponding actions
      jsonProgram.steps.forEach((step, index) => {
        // Add caption action
        program.push({
          kind: "CAPTION",
          order: index + 1,
          text: step.caption
        });

        // Add animation action
        program.push({
          kind: "ANIMATE",
          type: step.action,
          elements: step.indices,
          startTime: 0, // Will be calculated by executor
          duration: step.duration || 1.5
        });
      });

      return program;
    } catch (error) {
      logger.error(`Failed to parse JSON program: ${error}`);
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }
}