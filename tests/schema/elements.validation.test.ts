import { readFileSync } from 'fs';
import path from 'path';
import { validateElementsArray } from '../../src/schema/elements';

function extractLatestProjectFromLog(logPath: string): any | null {
  const content = readFileSync(logPath, 'utf8');
  const lines = content.split(/\n+/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const line = lines[i];
      if (!line) continue;
      const obj = JSON.parse(line);
      if (obj && obj.message === 'Project current state' && obj.project && obj.project.elements && obj.project.groups && obj.project.timeline) {
        return obj.project;
      }
    } catch {
      // ignore parse errors on non-JSON lines
    }
  }
  return null;
}

describe('Schema validation using attached log data', () => {
  const logFile = path.resolve(__dirname, '../../logs/combined/combined_20250813_095440-37549.log');
  const project = extractLatestProjectFromLog(logFile);

  it('should find a project payload in the log', () => {
    expect(project).toBeTruthy();
    expect(Array.isArray(project.elements)).toBe(true);
    expect(Array.isArray(project.groups)).toBe(true);
    expect(typeof project.timeline).toBe('object');
  });

  it('should validate all elements from the log payload', () => {
    if (!project) return fail('No project payload extracted from log');
    const res = validateElementsArray(project.elements);
    if (!res.valid) {
      // helpful error output
      // eslint-disable-next-line no-console
      console.error('Element validation errors:', res.errors);
    }
    expect(res.valid).toBe(true);
  });
});


