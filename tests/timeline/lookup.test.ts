// Which stop a cosmic time belongs to.

import { describe, expect, it } from 'vitest';
import { createCosmology } from '../../src/physics';
import { EPOCHS, epochIndexAt, resolveEpochs } from '../../src/timeline';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);

describe('epochIndexAt', () => {
  it('returns each epoch at its own anchor', () => {
    epochs.forEach((e, i) => expect(epochIndexAt(epochs, e.anchor)).toBe(i));
  });

  it('keeps the previous epoch until the next anchor', () => {
    epochs.slice(1).forEach((e, i) => expect(epochIndexAt(epochs, e.anchor * (1 - 1e-12))).toBe(i));
  });

  it('maps times outside the control to the first and last stops', () => {
    expect(epochIndexAt(epochs, 1e-50)).toBe(0);
    expect(epochIndexAt(epochs, cosmology.age * 2)).toBe(epochs.length - 1);
  });

  it('follows the control segment, not overlapping intervals', () => {
    // The Milky Way starts before reionization ends; between the two anchors
    // the panel shows reionization.
    const reionization = epochs.findIndex((e) => e.id === 'reionization');
    const milkyWay = epochs[reionization + 1]!;
    expect(milkyWay.anchor).toBeLessThan(epochs[reionization]!.end);
    expect(epochIndexAt(epochs, milkyWay.anchor * 0.99)).toBe(reionization);
  });
});
