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

      // Handle lists if present
      if (jsonProgram.lists) {
        jsonProgram.lists.forEach(list => {
          const listAction: any = {
            kind: "DRAW_LIST",
            data: list.data
          };
          if (list.title !== undefined) {
            listAction.title = list.title;
          }
          program.push(listAction);
        });
      }

      // Handle demo section if present (new format)
      if (jsonProgram.demo) {
        // Add array from demo data structure
        program.push({
          kind: "DRAW_ARRAY",
          values: jsonProgram.demo.dataStructure.data
        });

        // Convert demo steps to actions
        jsonProgram.demo.steps.forEach((step, index) => {
          // Add caption action
          program.push({
            kind: "CAPTION",
            order: index + 1,
            text: step.caption
          });

          // Add actions for this step
          if (step.actions) {
            step.actions.forEach(action => {
              if (action.type === "pointer") {
                const pointerAction: any = {
                  kind: "ANIMATE",
                  type: "pointer",
                  elements: [action.index!],
                  startTime: 0, // Will be calculated by executor
                  duration: 1.5
                };
                if (action.name !== undefined) {
                  pointerAction.pointerName = action.name;
                }
                program.push(pointerAction);
              } else if (action.indices) {
                program.push({
                  kind: "ANIMATE",
                  type: action.type as "highlight" | "unhighlight" | "select" | "deselect" | "focus" | "compare",
                  elements: action.indices,
                  startTime: 0, // Will be calculated by executor
                  duration: 1.5
                });
              }
            });
          }
        });
      } else if (jsonProgram.steps) {
        // Handle legacy steps format
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
      }

      return program;
    } catch (error) {
      logger.error(`Failed to parse JSON program: ${error}`);
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }
}