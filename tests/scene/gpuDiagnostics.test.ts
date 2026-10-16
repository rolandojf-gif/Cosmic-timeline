import { describe, expect, it } from 'vitest';
import { parseSceneDiagnostics } from '../../src/scene/gpuDiagnostics';

describe('GPU diagnostics are strictly opt-in', () => {
  it('never changes the ordinary scene even if a skip flag is present', () => {
    expect(parseSceneDiagnostics('')).toEqual({ enabled: false, skip: 'none' });
    expect(parseSceneDiagnostics('?gpuSkip=bloom')).toEqual({ enabled: false, skip: 'none' });
    expect(parseSceneDiagnostics('?gpuDiag=0&gpuSkip=halos')).toEqual({ enabled: false, skip: 'none' });
  });
  it('allows one intentional test at a time', () => {
    for (const pass of ['plasma', 'matter', 'halos', 'galaxies', 'bloom']) {
      expect(parseSceneDiagnostics('?gpuDiag=1&gpuSkip=' + pass)).toEqual({ enabled: true, skip: pass });
    }
    expect(parseSceneDiagnostics('?gpuDiag=1')).toEqual({ enabled: true, skip: 'none' });
    expect(parseSceneDiagnostics('?gpuDiag=1&gpuSkip=wrong')).toEqual({ enabled: true, skip: 'none' });
  });
});
