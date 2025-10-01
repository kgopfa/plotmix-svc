import type { Action, ActionProgram, JsonAnimationProgram } from '../../../types';
import { logger } from '../../../utils/logger';

export class DslCompiler {
  static compile(jsonInput: string): ActionProgram {
    try {
      const jsonProgram: JsonAnimationProgram = JSON.parse(jsonInput);
      const program: Action[] = [];

      // Handle new scenes format
      if (jsonProgram.scenes) {
        jsonProgram.scenes.forEach((scene: any) => {
          // Process each scene's content
          scene.content.forEach((item: any) => {
          switch (item.type) {
            case "heading":
              // Add heading from first item in data array
              program.push({
                kind: "HEADING",
                text: item.data[0] || "Untitled"
              });
              break;

            case "list":
              // Add list
              const listAction: any = {
                kind: "DRAW_LIST",
                data: item.data
              };
              if (item.title !== undefined) {
                listAction.title = item.title;
              }
              program.push(listAction);
              break;

            case "codeblock":
              // Add codeblock
              const codeblockAction: any = {
                kind: "DRAW_CODEBLOCK",
                data: item.data
              };
              if (item.title !== undefined) {
                codeblockAction.title = item.title;
              }
              program.push(codeblockAction);
              break;

            case "demo":
              // Add array from demo data structure
              program.push({
                kind: "DRAW_ARRAY",
                values: item.dataStructure.data
              });

              // Convert demo steps to actions
              item.steps.forEach((step: any, stepIndex: number) => {
                // Add caption action if present
                if (step.caption) {
                  program.push({
                    kind: "CAPTION",
                    order: stepIndex + 1,
                    text: step.caption
                  });
                }

                // Add actions for this step
                if (step.actions) {
                  step.actions.forEach((action: any) => {
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
              break;
          }
          });
        });
      } else if ((jsonProgram as any).content) {
        // Handle legacy content array format for backward compatibility
        (jsonProgram as any).content.forEach((item: any) => {
          switch (item.type) {
            case "heading":
              // Add heading from first item in data array
              program.push({
                kind: "HEADING",
                text: item.data[0] || "Untitled"
              });
              break;

            case "list":
              // Add list
              const listAction: any = {
                kind: "DRAW_LIST",
                data: item.data
              };
              if (item.title !== undefined) {
                listAction.title = item.title;
              }
              program.push(listAction);
              break;

            case "codeblock":
              // Add codeblock
              const codeblockAction: any = {
                kind: "DRAW_CODEBLOCK",
                data: item.data
              };
              if (item.title !== undefined) {
                codeblockAction.title = item.title;
              }
              program.push(codeblockAction);
              break;

            case "demo":
              // Add array from demo data structure
              program.push({
                kind: "DRAW_ARRAY",
                values: item.dataStructure.data
              });

              // Convert demo steps to actions
              item.steps.forEach((step: any, stepIndex: number) => {
                // Add caption action if present
                if (step.caption) {
                  program.push({
                    kind: "CAPTION",
                    order: stepIndex + 1,
                    text: step.caption
                  });
                }

                // Add actions for this step
                if (step.actions) {
                  step.actions.forEach((action: any) => {
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
              break;
          }
        });
      } else {
        // Handle other legacy formats for backward compatibility
        // Handle setup if present
        if ((jsonProgram as any).setup) {
          const setup = (jsonProgram as any).setup;
          if (setup.seed !== undefined) {
            program.push({
              kind: "SETUP",
              seed: setup.seed,
              style: setup.style || "auto"
            });
          } else if (setup.style) {
            program.push({
              kind: "SETUP",
              seed: 0,
              style: setup.style
            });
          }

          // Handle array setup
          if (setup.array) {
            const arrayAction: any = {
              kind: "DRAW_ARRAY",
              values: setup.array.values
            };
            if (setup.array.gap !== undefined) {
              arrayAction.gap = setup.array.gap;
            }
            if (setup.array.cell !== undefined) {
              arrayAction.cell = setup.array.cell;
            }
            program.push(arrayAction);
          }

          // Handle heading
          if (setup.heading) {
            program.push({
              kind: "HEADING",
              text: setup.heading
            });
          }

          // Handle subtitle
          if (setup.subtitle) {
            program.push({
              kind: "SUBTITLE",
              order: 1,
              text: setup.subtitle
            });
          }
        }

        // Handle lists if present
        if ((jsonProgram as any).lists) {
          (jsonProgram as any).lists.forEach((list: any) => {
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

        // Handle demo section if present
        if ((jsonProgram as any).demo) {
          const demo = (jsonProgram as any).demo;
          // Add array from demo data structure
          program.push({
            kind: "DRAW_ARRAY",
            values: demo.dataStructure.data
          });

          // Convert demo steps to actions
          demo.steps.forEach((step: any, index: number) => {
            // Add caption action
            program.push({
              kind: "CAPTION",
              order: index + 1,
              text: step.caption
            });

            // Add actions for this step
            if (step.actions) {
              step.actions.forEach((action: any) => {
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
        } else if ((jsonProgram as any).steps) {
          // Handle legacy steps format
          (jsonProgram as any).steps.forEach((step: any, index: number) => {
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
      }

      return program;
    } catch (error) {
      logger.error(`Failed to parse JSON program: ${error}`);
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }
}