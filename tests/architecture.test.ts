// physics/ and timeline/ must stay pure TypeScript: no DOM, no three.js,
// no imports from ui/ or scene/.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../src/', import.meta.url));

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

describe('pure modules', () => {
  for (const area of ['physics', 'timeline']) {
    it(`${area}/ has no DOM, three.js, ui/ or scene/ dependencies`, () => {
      for (const file of tsFiles(join(root, area))) {
        const source = readFileSync(file, 'utf8');
        expect(source, file).not.toMatch(/from\s+['"]three['"]/);
        expect(source, file).not.toMatch(/from\s+['"][^'"]*\/(ui|scene)\//);
        expect(source, file).not.toMatch(/\b(document|window|navigator)\./);
      }
    });
  }
});
