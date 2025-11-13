const os = require('os');
const path = require('path');
const fs = require('fs');

// Shared E2E test timeout constants
const TIMEOUTS = {
  ALPINE_INIT: 300,        // Wait for Alpine.js to initialize
  TERMINAL_READY: 600,     // Wait for terminal to be ready for input
  TERMINAL_EXEC: 500,      // Wait for terminal command to execute
  TERMINAL_EXEC_FAST: 300, // Wait for fast terminal commands
  PROJECT_LOAD: 1500,      // Wait for projects list to load
  PROJECT_DETAIL: 2000,    // Wait for project details to load
  TAB_CREATE: 500,         // Wait for tab to be created
  TAB_CLOSE: 200,          // Wait for tab close animation
  SPLIT_PANE_INIT: 500,    // Wait for split-pane to initialize
  HEGEL_CMD: 2000,         // Wait for hegel command to execute
};

/**
 * Launch Electron for tests with proper env vars (disables quit confirmation)
 * @param {Object} options - Launch options
 * @param {boolean} options.isolatedState - If true, use isolated temp directory for hegel state (default: false)
 * @returns {Promise<ElectronApplication>}
 */
async function launchTestElectron(options = {}) {
  const { _electron: electron } = require('@playwright/test');
  const { isolatedState = false } = options;

  const env = {
    ...process.env,
    TESTING: 'true'
  };

  // Use isolated temp directory for hegel state if requested
  // This prevents test-generated reviews from polluting the project's .hegel/reviews.json
  if (isolatedState) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const stateDir = path.join(os.tmpdir(), `hegel-test-${timestamp}-${random}`);

    // Create the state directory so hegel commands can write to it
    fs.mkdirSync(stateDir, { recursive: true });

    env.HEGEL_STATE_DIR = stateDir;
  }

  return await electron.launch({
    args: ['.'],
    env
  });
}

/**
 * Poll for a condition to be true, checking every pollIntervalMs until timeoutMs is reached.
 * More reliable and faster than blind waitForTimeout() calls.
 *
 * @param {Page} page - Playwright page/window object
 * @param {Function} checkFn - Async function that returns true when condition is met
 * @param {number} timeoutMs - Maximum time to wait (default: 2000ms)
 * @param {number} pollIntervalMs - How often to check (default: 50ms)
 * @param {string} errorMessage - Custom error message when timeout is reached
 * @returns {Promise<void>}
 * @throws {Error} If condition is not met within timeout
 *
 * @example
 * await waitForCondition(
 *   page,
 *   async () => await page.locator('.my-element').isVisible(),
 *   2000,
 *   50,
 *   'Element .my-element did not become visible'
 * );
 */
async function waitForCondition(page, checkFn, timeoutMs = 2000, pollIntervalMs = 50, errorMessage = null) {
  const startTime = Date.now();
  let lastError = null;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await checkFn();
      if (result) {
        return;
      }
    } catch (error) {
      // Store error but continue polling
      lastError = error;
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  const defaultMessage = `Condition not met within ${timeoutMs}ms`;
  const finalMessage = errorMessage || defaultMessage;
  const errorDetails = lastError ? `\nLast error: ${lastError.message}` : '';
  throw new Error(finalMessage + errorDetails);
}

/**
 * Wait for a tab with given text to appear
 */
async function waitForTab(page, tabText, pane = 'left', timeoutMs = TIMEOUTS.TAB_CREATE) {
  await waitForCondition(
    page,
    async () => {
      const tab = await page.locator(`.${pane}-pane .tab`).filter({ hasText: tabText });
      return await tab.isVisible();
    },
    timeoutMs,
    50,
    `Tab "${tabText}" did not appear in ${pane} pane`
  );
}

/**
 * Wait for projects list to be visible
 */
async function waitForProjectsList(page, timeoutMs = TIMEOUTS.ALPINE_INIT) {
  await waitForCondition(
    page,
    async () => await page.locator('.project-card').first().isVisible(),
    timeoutMs,
    50,
    'Projects list did not appear'
  );
}

/**
 * Wait for project content (markdown or error) to load
 */
async function waitForProjectContent(page, timeoutMs = TIMEOUTS.PROJECT_DETAIL) {
  await waitForCondition(
    page,
    async () => {
      const markdown = await page.locator('.markdown-content:visible').first();
      const error = await page.locator('.tab-content:visible .error').first();
      const hasMarkdown = await markdown.isVisible().catch(() => false);
      const hasError = await error.isVisible().catch(() => false);
      return hasMarkdown || hasError;
    },
    timeoutMs,
    50,
    'Project content did not load'
  );
}

/**
 * Wait for Alpine.js to initialize (x-data component ready)
 */
async function waitForAlpineInit(page, timeoutMs = TIMEOUTS.ALPINE_INIT) {
  await waitForCondition(
    page,
    async () => await page.locator('[x-data]').isVisible(),
    timeoutMs,
    50,
    'Alpine.js did not initialize'
  );
}

/**
 * Wait for hegel-ide project to auto-open on startup
 * (This happens when terminal CWD matches a project path)
 */
async function waitForAutoOpenedProject(page, projectName = 'hegel-ide', timeoutMs = TIMEOUTS.PROJECT_LOAD) {
  await waitForTab(page, projectName, 'left', timeoutMs);
}

/**
 * Click the first project in the projects list and return its name
 * @param {Page} page - Playwright page/window object
 * @returns {Promise<string>} The project name that was clicked
 */
async function clickFirstProject(page) {
  await waitForProjectsList(page);
  const firstProjectName = await page.locator('.project-name').first();
  const projectName = await firstProjectName.textContent();
  await firstProjectName.click();
  return projectName;
}

module.exports = {
  ...TIMEOUTS,
  launchTestElectron,
  waitForCondition,
  waitForTab,
  waitForProjectsList,
  waitForProjectContent,
  waitForAlpineInit,
  waitForAutoOpenedProject,
  clickFirstProject
};
