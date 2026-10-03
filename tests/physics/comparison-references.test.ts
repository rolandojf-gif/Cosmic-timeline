// The reference values behind the everyday comparisons are data: each one
// matches the value quoted in docs/fuentes.md under its source.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CELSIUS_ZERO_K, SUN_CENTRAL_TEMPERATURE_K, SUN_SURFACE_TEMPERATURE_K } from '../../src/physics';

const doc = readFileSync(new URL('../../docs/fuentes.md', import.meta.url), 'utf8');
const section = (id: string): string => doc.split(`### \`${id}\``)[1]?.split(/^#{2,3} /m)[0] ?? '';

describe('comparison references', () => {
  it('uses the SI definition of the degree Celsius', () => {
    expect(CELSIUS_ZERO_K).toBe(273.15);
    expect(section('si-brochure-2019')).toContain('273,15');
  });

  it('uses the IAU nominal solar effective temperature', () => {
    expect(SUN_SURFACE_TEMPERATURE_K).toBe(5772);
    expect(section('iau-2015-b3')).toContain('5772 K');
  });

  it('uses the central temperature of the standard solar model', () => {
    expect(SUN_CENTRAL_TEMPERATURE_K).toBe(15.696e6);
    expect(section('bahcall-2001')).toContain('15,696 × 10⁶ K');
    // Independent cross-check quoted in the same entry (NASA NSSDC: 1.571 × 10⁷ K).
    expect(Math.abs(SUN_CENTRAL_TEMPERATURE_K / 1.571e7 - 1)).toBeLessThan(0.005);
  });
});
