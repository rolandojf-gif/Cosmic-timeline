import { describe, expect, it } from 'vitest';
import { PLANCK2018 } from '../../src/physics';
import { generateCosmicWeb } from '../../src/scene/cosmicWebLoader';

describe('generateCosmicWeb', () => {
  it('resolves with valid CosmicWeb data on a test grid', async () => {
    const spectrum = {
      omegaM: PLANCK2018.omegaM,
      h: PLANCK2018.H0 / 100,
      omegaBh2: PLANCK2018.omegaBh2,
      TCMB0: PLANCK2018.TCMB0,
      ns: PLANCK2018.ns,
      sigma8: PLANCK2018.sigma8,
    };
    const options = { n: 8, boxMpcH: 100, smoothingMpcH: 2.5, seed: 123 };

    const web = await generateCosmicWeb(spectrum, options);

    expect(web.n).toBe(8);
    expect(web.boxMpcH).toBe(100);
    expect(web.displacement.length).toBe(3 * 8 * 8 * 8);
    expect(web.eigenvalues.length).toBe(3 * 8 * 8 * 8);
    expect(web.delta.length).toBe(8 * 8 * 8);
    expect(web.sigma).toBeGreaterThan(0);
    expect(Array.isArray(web.peaks)).toBe(true);
  });
});
