/**
 * Helper functions for generating narration text from scene content
 */

export interface SceneContent {
  id: string;
  name: string;
  content: Array<{
    type: 'heading' | 'list' | 'codeblock' | 'demo';
    data?: string[];
    title?: string;
    dataStructure?: { type: string; data: (number | string)[] };
    steps?: Array<{ caption?: string; actions?: any[] }>;
  }>;
}

/**
 * Generate narration text from scene content
 * Creates a natural-sounding script that describes what's happening in the scene
 */
export function generateNarrationText(scene: SceneContent): string {
  const parts: string[] = [];

  // Start with scene name if it's descriptive
  if (scene.name && scene.name !== scene.id) {
    parts.push(`This is ${scene.name}.`);
  }

  for (const item of scene.content) {
    switch (item.type) {
      case 'heading':
        if (item.data && item.data[0]) {
          parts.push(item.data[0]);
        }
        break;

      case 'list':
        if (item.data && item.data.length > 0) {
          const listData = item.data;
          if (listData.length === 1) {
            parts.push(listData[0]!);
          } else {
            const listText = listData
              .map((point, index) => {
                if (index === listData.length - 1) {
                  return `and ${point}`;
                }
                return `${point},`;
              })
              .join(' ');
            parts.push(listText);
          }
        }
        break;

      case 'codeblock':
        if (item.title) {
          parts.push(`Here is ${item.title}.`);
        }
        if (item.data && item.data[0]) {
          // For code blocks, we might want to read the first few lines or just mention it
          const codeLines = item.data[0].split('\n').slice(0, 3);
          if (codeLines.length > 0) {
            parts.push(`The code shows: ${codeLines.join(' ').substring(0, 100)}.`);
          }
        }
        break;

      case 'demo':
        if (item.dataStructure) {
          const dataType = item.dataStructure.type;
          const data = item.dataStructure.data;
          parts.push(`Let's visualize this ${dataType} with ${data.length} elements: ${data.slice(0, 5).join(', ')}${data.length > 5 ? ' and more' : ''}.`);
        }
        
        if (item.steps && item.steps.length > 0) {
          // Include step captions as narration
          for (const step of item.steps) {
            if (step.caption) {
              parts.push(step.caption);
            }
          }
        }
        break;
    }
  }

  // Join all parts with natural pauses
  return parts.join(' ');
}

/**
 * Estimate narration duration based on text length
 * Average speaking rate is ~150 words per minute
 */
export function estimateNarrationDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  const durationInSeconds = (words / wordsPerMinute) * 60;
  // Add 10% buffer for pauses
  return Math.ceil(durationInSeconds * 1.1);
}

