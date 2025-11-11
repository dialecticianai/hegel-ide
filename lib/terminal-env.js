// Pure function for building terminal environment with HTTP URL injection

function buildTerminalEnv(baseEnv, httpPort) {
  const env = baseEnv || {};
  return {
    ...env,
    HEGEL_IDE_URL: `http://localhost:${httpPort}`
  };
}

module.exports = { buildTerminalEnv };
