// The citations shown in the interface match docs/fuentes.md.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPARISON_SOURCES, EPOCHS, MODEL_SOURCES, SOURCES } from '../../src/timeline';

const doc = readFileSync(new URL('../../docs/fuentes.md', import.meta.url), 'utf8');
const headings = new Set([...doc.matchAll(/^### `([^`]+)`/gm)].map((m) => m[1]!));

/** The section of docs/fuentes.md under a source heading. */
const section = (id: string): string => doc.split(`### \`${id}\``)[1]?.split(/^#{2,3} /m)[0] ?? '';

describe('sources shown in the interface', () => {
  it('each id is documented in docs/fuentes.md, with the same link', () => {
    for (const [id, source] of Object.entries(SOURCES)) {
      expect(headings, id).toContain(id);
      expect(section(id), id).toContain(source.url);
    }
  });

  it('cover every source cited by the epochs, the model and the comparisons', () => {
    const cited = [
      ...EPOCHS.flatMap((e) => [...e.sources, ...(e.landmarks ?? []).flatMap((l) => l.sources)]),
      ...MODEL_SOURCES,
      ...COMPARISON_SOURCES,
    ];
    for (const id of cited) expect(Object.keys(SOURCES)).toContain(id);
  });
});
