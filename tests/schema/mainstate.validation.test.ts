import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { validateElementsArray } from '../../src/schema/elements';
import { validateAnimationArrayWithNaming } from '../../src/schema/animations';

interface MainStateLike {
  elements: any[];
  groups: any[];
  timeline: any;
}

function listJsonFilesRecursive(dir: string): string[] {
  let results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results = results.concat(listJsonFilesRecursive(full));
    } else if (st.isFile() && entry.toLowerCase().endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

describe('MainState fixture validation (fixtures/structure)', () => {
  const baseDir = path.resolve(__dirname, '../fixtures/structure');
  let files: string[] = [];
  try {
    files = listJsonFilesRecursive(baseDir);
  } catch {
    files = [];
  }

  if (files.length === 0) {
    it('no fixtures found under tests/fixtures/structure (skipping)', () => {
      expect(true).toBe(true);
    });
    return;
  }

  for (const file of files) {
    it(`validates ${path.relative(process.cwd(), file)}`, () => {
      let data: MainStateLike;
      try {
        data = JSON.parse(readFileSync(file, 'utf8')) as MainStateLike;
      } catch (e: any) {
        throw new Error(`Failed to parse JSON for ${file}: ${e?.message || e}`);
      }

      // top-level shape
      if (!Array.isArray(data.elements) || !Array.isArray(data.groups) || typeof data.timeline !== 'object') {
        throw new Error(`Invalid top-level keys in ${file}: expected { elements[], groups[], timeline{} }`);
      }

      // elements
      const elementsResult = validateElementsArray(data.elements);
      if (!elementsResult.valid) {
        throw new Error(`Element validation failed for ${file}: ${elementsResult.errors.join('; ')}`);
      }

      // groups: references and animations naming
      const elementIds = new Set<string>(data.elements.map((e: any) => e.id));
      for (let i = 0; i < data.groups.length; i++) {
        const g = data.groups[i];
        const missingIds = (g.elementIds as string[]).filter((id) => !elementIds.has(id));
        if (missingIds.length) {
          throw new Error(`Group ${g.id} in ${file} references missing elementIds: ${missingIds.join(', ')}`);
        }
        const arr = Array.isArray(g.animations) ? g.animations : [];
        const animRes = validateAnimationArrayWithNaming(arr);
        if (!animRes.valid) {
          throw new Error(`Group animations invalid for ${g.id} in ${file}: ${animRes.errors.join('; ')}`);
        }
      }
    });
  }
});


