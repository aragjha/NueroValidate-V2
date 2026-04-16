import { describe, it, expect } from 'vitest';
import { worstStatus, type AtomStatus } from './StatusRollup';

describe('worstStatus', () => {
  it('returns auto-validated when all atoms are auto-validated', () => {
    expect(worstStatus(['auto-validated', 'auto-validated'])).toBe('auto-validated');
  });
  it('returns validated when mix of auto-validated and validated', () => {
    expect(worstStatus(['auto-validated', 'validated', 'auto-validated'])).toBe('validated');
  });
  it('returns in-progress when any atom is in-progress', () => {
    expect(worstStatus(['validated', 'in-progress', 'auto-validated'])).toBe('in-progress');
  });
  it('returns needs-config when any atom needs config', () => {
    expect(worstStatus(['validated', 'in-progress', 'needs-config'])).toBe('needs-config');
  });
  it('returns needs-config for empty array', () => {
    expect(worstStatus([])).toBe('needs-config');
  });
  it('needs-config beats everything', () => {
    expect(worstStatus(['auto-validated', 'validated', 'in-progress', 'needs-config'])).toBe('needs-config');
  });
});
