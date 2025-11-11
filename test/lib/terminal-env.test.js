import { describe, it, expect } from 'vitest';
import { buildTerminalEnv } from '../../lib/terminal-env.js';

describe('buildTerminalEnv', () => {
  it('adds HEGEL_IDE_URL to environment', () => {
    const baseEnv = { PATH: '/usr/bin', HOME: '/home/user' };
    const port = 3000;

    const result = buildTerminalEnv(baseEnv, port);

    expect(result.HEGEL_IDE_URL).toBe('http://localhost:3000');
  });

  it('preserves all original environment variables', () => {
    const baseEnv = { PATH: '/usr/bin', HOME: '/home/user', SHELL: '/bin/bash' };
    const port = 3000;

    const result = buildTerminalEnv(baseEnv, port);

    expect(result.PATH).toBe('/usr/bin');
    expect(result.HOME).toBe('/home/user');
    expect(result.SHELL).toBe('/bin/bash');
  });

  it('does not mutate original environment object', () => {
    const baseEnv = { PATH: '/usr/bin', HOME: '/home/user' };
    const originalEnv = { ...baseEnv };
    const port = 3000;

    buildTerminalEnv(baseEnv, port);

    expect(baseEnv).toEqual(originalEnv);
    expect(baseEnv.HEGEL_IDE_URL).toBeUndefined();
  });

  it('formats URL correctly with port number', () => {
    const baseEnv = {};

    expect(buildTerminalEnv(baseEnv, 8080).HEGEL_IDE_URL).toBe('http://localhost:8080');
    expect(buildTerminalEnv(baseEnv, 3000).HEGEL_IDE_URL).toBe('http://localhost:3000');
    expect(buildTerminalEnv(baseEnv, 65535).HEGEL_IDE_URL).toBe('http://localhost:65535');
  });

  it('handles undefined base environment', () => {
    const result = buildTerminalEnv(undefined, 3000);

    expect(result.HEGEL_IDE_URL).toBe('http://localhost:3000');
    expect(typeof result).toBe('object');
  });

  it('handles zero port', () => {
    const baseEnv = {};
    const result = buildTerminalEnv(baseEnv, 0);

    expect(result.HEGEL_IDE_URL).toBe('http://localhost:0');
  });

  it('handles empty base environment', () => {
    const result = buildTerminalEnv({}, 4000);

    expect(result.HEGEL_IDE_URL).toBe('http://localhost:4000');
    expect(Object.keys(result)).toEqual(['HEGEL_IDE_URL']);
  });
});
