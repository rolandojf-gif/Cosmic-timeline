import { describe, expect, it } from 'vitest';
import { diagnosticsFromUrl } from '../../src/scene/diagnostics';

describe('?diag diagnostic switches', () => {
  it('are all off unless the URL names them', () => {
    expect(diagnosticsFromUrl('').size).toBe(0);
    expect(diagnosticsFromUrl('?fps').size).toBe(0);
    expect(diagnosticsFromUrl('?diag=').size).toBe(0);
  });

  it('accept several, comma-separated, and ignore unknown names', () => {
    expect([...diagnosticsFromUrl('?fps&diag=nohalo,nobloom,bogus')].sort()).toEqual(['nobloom', 'nohalo']);
    expect([...diagnosticsFromUrl('?diag=nomatter')]).toEqual(['nomatter']);
  });
});
