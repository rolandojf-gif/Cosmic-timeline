// The colour of a black body: the colour-matching fit against CIE 1931
// tabulated values, the chromaticity against CIE illuminant A, and the
// behaviour at the extremes the model reaches.

import { describe, expect, it } from 'vitest';
import { blackbodyChromaticity, blackbodySrgb, colourMatching } from '../../src/scene/blackbody';

describe('CIE 1931 colour-matching functions (Wyman, Sloan & Shirley 2013 fit)', () => {
  // Tabulated CIE 1931 2° values (CIE 015:2018). The fit's documented maximum
  // squared error (4.9e-4 for z̄) allows ~2 % at the peaks: here 0.6 % for x̄ at
  // 600 nm and 1.9 % for z̄ at 450 nm. Chromaticities, which integrate over the
  // spectrum, are much less sensitive (illuminant A test below: < 0.002).
  it('reproduces the tabulated peaks to within the fit accuracy', () => {
    const near = (value: number, table: number) => expect(Math.abs(value / table - 1)).toBeLessThan(0.025);
    near(colourMatching(555)[1], 1.0);
    near(colourMatching(600)[0], 1.0622);
    near(colourMatching(450)[2], 1.7471);
  });
});

describe('black-body chromaticity', () => {
  // CIE illuminant A: a Planckian radiator at ~2856 K, x = 0.44757, y = 0.40745 (CIE 015:2018).
  it('matches CIE illuminant A at 2856 K', () => {
    const { x, y } = blackbodyChromaticity(2856);
    expect(Math.abs(x - 0.44757)).toBeLessThan(2e-3);
    expect(Math.abs(y - 0.40745)).toBeLessThan(2e-3);
  });

  it('stops changing at very high temperature (Rayleigh-Jeans limit)', () => {
    const a = blackbodyChromaticity(1e6);
    const b = blackbodyChromaticity(1.85e15);
    expect(Math.abs(a.x - b.x)).toBeLessThan(1e-3);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1e-3);
    expect(b.x).toBeLessThan(0.25);
  });

  it('stays finite down to the microwave background', () => {
    for (const T of [2.7255, 70, 798, 2970, 1e9, 1.85e15]) {
      const { x, y } = blackbodyChromaticity(T);
      expect(Number.isFinite(x) && Number.isFinite(y), `T = ${T}`).toBe(true);
    }
  });
});

describe('black-body sRGB colour', () => {
  it('is orange at recombination (2970 K) and bluish white when very hot', () => {
    const [r, g, b] = blackbodySrgb(2970);
    expect(r).toBeCloseTo(1, 12);
    expect(g).toBeGreaterThan(b);
    expect(g).toBeLessThan(0.9);
    const hot = blackbodySrgb(1e9);
    expect(hot[2]).toBeCloseTo(1, 12);
    expect(hot[0]).toBeLessThan(hot[2]);
  });

  it('is close to white near 6500 K', () => {
    for (const channel of blackbodySrgb(6500)) expect(channel).toBeGreaterThan(0.9);
  });

  it('stays in [0, 1]', () => {
    for (const T of [798, 1500, 2970, 6500, 1e5, 1e12]) {
      for (const channel of blackbodySrgb(T)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });
});
