// The figures quoted in the licence line come from the constants that
// implement each licence.

import { describe, expect, it } from 'vitest';
import { MESSAGES, fill } from '../../src/i18n';
import { createCosmology } from '../../src/physics';
import { VISUAL_LICENCES, createVisualMap } from '../../src/scene/visualMap';
import { EPOCHS, resolveEpochs } from '../../src/timeline';
import { licenceVars } from '../../src/ui/licenceVars';

const cosmology = createCosmology();
const growth = createVisualMap(cosmology, resolveEpochs(cosmology, EPOCHS)).growth;

describe('licence line figures', () => {
  it('fills every placeholder of every licence text, in both languages', () => {
    for (const locale of ['es', 'en'] as const) {
      const m = MESSAGES[locale];
      const vars = licenceVars(locale, m, growth);
      for (const id of VISUAL_LICENCES) {
        expect(fill(m.licences[id].detail, vars[id]), `${locale} ${id}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('quotes the transition time, the particle counts and the Draper point', () => {
    const vars = licenceVars('es', MESSAGES.es, growth);
    expect(vars.transitions.duration).toBe('1,75 s');
    expect(vars.density).toEqual({ desktop: '30.000', mobile: '12.000' });
    expect(vars.brightness).toEqual({ draper: '798', celsius: '525' });
    expect(vars.separation.range).toBe('2,02 mil billones de');
  });
});
