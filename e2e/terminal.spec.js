const { test, expect, _electron: electron } = require('@playwright/test');
const { ALPINE_INIT, TERMINAL_READY, TERMINAL_EXEC, TERMINAL_EXEC_FAST } = require('./test-constants');

test.describe('Terminal Presence', () => {
  test('terminal container exists', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait briefly for Alpine
    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Find terminal container (updated ID for tab system)
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('xterm DOM elements are rendered', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for xterm to initialize
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    // xterm creates a div with class "xterm"
    const xtermElement = await mainWindow.locator('.xterm');
    expect(await xtermElement.count()).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('terminal has visible dimensions', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    const boundingBox = await terminalContainer.boundingBox();

    // Container should have non-zero dimensions
    expect(boundingBox.width).toBeGreaterThan(0);
    expect(boundingBox.height).toBeGreaterThan(0);

    await electronApp.close();
  });
});

test.describe('Terminal I/O', () => {
  test('simple echo command produces output', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for terminal to be ready
    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Focus terminal (click on it)
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    // Type command
    await mainWindow.keyboard.type('echo "hello playwright"');
    await mainWindow.keyboard.press('Enter');

    // Wait for command to execute
    await mainWindow.waitForTimeout(TERMINAL_EXEC);

    // Check terminal content contains our output
    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();
    expect(content).toContain('hello playwright');

    await electronApp.close();
  });

  test('pwd command shows current directory', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(600);

    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    await mainWindow.keyboard.type('pwd');
    await mainWindow.keyboard.press('Enter');

    await mainWindow.waitForTimeout(500);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();

    // Should contain "hegel-ide" (our project directory)
    expect(content).toContain('hegel-ide');

    await electronApp.close();
  });

  test('sequential commands work', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(600);

    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    // First command
    await mainWindow.keyboard.type('echo "first"');
    await mainWindow.keyboard.press('Enter');
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    // Second command
    await mainWindow.keyboard.type('echo "second"');
    await mainWindow.keyboard.press('Enter');
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();

    // Both outputs should be present
    expect(content).toContain('first');
    expect(content).toContain('second');

    await electronApp.close();
  });
});
