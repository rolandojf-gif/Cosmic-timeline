// Texts: ES and EN have the same keys and placeholders, cover every epoch,
// landmark and licence, contain no figures and respect the approved labels.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MESSAGES, detectLocale, fill, placeholders } from '../../src/i18n';
import { VISUAL_LICENCES } from '../../src/scene/visualMap';
import { EPOCHS } from '../../src/timeline';

type Tree = { readonly [key: string]: string | Tree };

/** Every string in a message tree, keyed by its dotted path. */
function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

const es = leaves(MESSAGES.es as unknown as Tree);
const en = leaves(MESSAGES.en as unknown as Tree);

/** Proper names that contain digits (a data release, galaxies). Anything else with a digit is a figure. */
const NAMES_WITH_DIGITS = ['Planck 2018', 'MoM-z14', 'JADES-GS-z14-0'];

describe('message keys', () => {
  it('ES and EN have exactly the same keys', () => {
    expect([...en.keys()].sort()).toEqual([...es.keys()].sort());
  });

  it('ES and EN use the same placeholders in every text', () => {
    for (const [key, text] of es) expect(placeholders(en.get(key)!), key).toEqual(placeholders(text));
  });

  it('no text is empty', () => {
    for (const [key, text] of [...es, ...en]) expect(text.trim(), key).not.toBe('');
  });
});

describe('content rules', () => {
  it('texts contain no figures: numbers are interpolated from the model or epochs.ts', () => {
    for (const [key, text] of [...es, ...en]) {
      const stripped = NAMES_WITH_DIGITS.reduce((s, name) => s.replaceAll(name, ''), text);
      expect(stripped, key).not.toMatch(/[0-9]/);
    }
  });

  it('never speak of the size of the universe (it may be infinite)', () => {
    for (const [key, text] of [...es, ...en]) {
      expect(text, key).not.toMatch(/tamaño del universo|size of the universe/i);
    }
  });

  it('use the approved label for the observed region', () => {
    expect(MESSAGES.es.panel.observedRegion).toBe('Radio de la región que hoy observamos');
    expect(MESSAGES.en.panel.observedRegion).toBe('Radius of the region we observe today');
  });
});

describe('coverage', () => {
  it('every epoch and landmark has its texts', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const epoch of EPOCHS) {
        expect(MESSAGES[locale].epochs[epoch.id].name, `${locale} ${epoch.id}`).toBeTruthy();
        for (const l of epoch.landmarks ?? []) {
          expect(Object.keys(MESSAGES[locale].landmarks), `${locale} ${l.id}`).toContain(l.id);
        }
      }
    }
  });

  it('every declared visual licence has texts and an entry in docs/licencias-visuales.md', () => {
    const doc = readFileSync(new URL('../../docs/licencias-visuales.md', import.meta.url), 'utf8');
    const documented = [...doc.matchAll(/^## `([^`]+)`/gm)].map((m) => m[1]);
    expect(documented.sort()).toEqual([...VISUAL_LICENCES].sort());
    for (const id of VISUAL_LICENCES) {
      expect(MESSAGES.es.licences[id].detail).toBeTruthy();
      expect(MESSAGES.en.licences[id].detail).toBeTruthy();
    }
  });
});

describe('locale and interpolation', () => {
  it('prefers ?lang, then the browser languages, then English', () => {
    expect(detectLocale('?lang=en', ['es-ES'])).toBe('en');
    expect(detectLocale('?lang=fr', ['es-ES', 'en'])).toBe('es');
    expect(detectLocale('', ['de-DE', 'en-GB'])).toBe('en');
    expect(detectLocale('', ['ES-mx'])).toBe('es');
    expect(detectLocale('', ['fr'])).toBe('en');
  });

  it('fills placeholders and refuses a missing value', () => {
    expect(fill('{a} y {b}', { a: '1', b: '2' })).toBe('1 y 2');
    expect(() => fill('{a}', {})).toThrow(/missing value/);
  });
});
