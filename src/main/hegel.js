// Reusable hegel command spawner - DRY extraction

const { spawn } = require('child_process');

/**
 * Run a hegel command and return the result
 *
 * @param {string[]} args - Command arguments (e.g., ['pm', 'discover', 'list', '--json'])
 * @param {Object} options - Optional configuration
 * @param {boolean} options.parseJson - Parse stdout as JSON (default: false)
 * @param {string} options.stdin - Data to write to stdin (default: null)
 * @param {string} options.cwd - Working directory (default: null)
 * @param {string} options.errorPrefix - Error message prefix (default: 'hegel command failed')
 * @returns {Promise<any>} - Parsed JSON object or { success: true }
 *
 * @example
 * // Get projects list (parses JSON)
 * const result = await runHegelCommand(['pm', 'discover', 'list', '--json'], { parseJson: true });
 *
 * @example
 * // Remove project (returns success)
 * await runHegelCommand(['pm', 'remove', 'my-project'], { errorPrefix: 'Failed to remove project' });
 *
 * @example
 * // Save review (writes to stdin)
 * await runHegelCommand(['review', 'SPEC.md'], { stdin: jsonlData, cwd: projectPath });
 */
async function runHegelCommand(args, options = {}) {
  const {
    parseJson = false,
    stdin = null,
    cwd = null,
    errorPrefix = 'hegel command failed'
  } = options;

  return new Promise((resolve, reject) => {
    const spawnOptions = cwd ? { cwd, env: process.env } : {};
    const hegel = spawn('hegel', args, spawnOptions);
    let stdout = '';
    let stderr = '';

    hegel.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    hegel.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    hegel.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${errorPrefix}: ${stderr}`));
        return;
      }

      if (parseJson) {
        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (error) {
          reject(new Error(`Failed to parse hegel output: ${error.message}`));
        }
      } else {
        resolve({ success: true });
      }
    });

    hegel.on('error', (error) => {
      reject(new Error(`Failed to spawn hegel: ${error.message}`));
    });

    // Write stdin if provided
    if (stdin) {
      hegel.stdin.write(stdin);
      hegel.stdin.end();
    }
  });
}

module.exports = { runHegelCommand };
