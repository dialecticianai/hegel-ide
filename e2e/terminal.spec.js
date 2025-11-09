const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { ALPINE_INIT, TERMINAL_READY, TERMINAL_EXEC, TERMINAL_EXEC_FAST, TAB_CLOSE } = require('./test-constants');

test.describe('Terminal Presence', () => {
  test('terminal renders with correct DOM structure', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for xterm to initialize
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    // Verify terminal container exists and is visible
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    // Verify xterm DOM elements are rendered
    const xtermElement = await mainWindow.locator('.xterm');
    expect(await xtermElement.count()).toBeGreaterThan(0);

    // Verify container has non-zero dimensions
    const boundingBox = await terminalContainer.boundingBox();
    expect(boundingBox.width).toBeGreaterThan(0);
    expect(boundingBox.height).toBeGreaterThan(0);

    await electronApp.close();
  });
});

test.describe('Terminal I/O', () => {
  test('simple echo command produces output', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for terminal to be ready
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Focus terminal (click on it)
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    // Type command
    await mainWindow.keyboard.type('echo "hello playwright"');
    await mainWindow.keyboard.press('Enter');

    // Wait for command to execute
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_EXEC);

    // Check terminal content contains our output
    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();
    expect(content).toContain('hello playwright');

    await electronApp.close();
  });

  test('pwd command shows current directory', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_READY);

    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    await mainWindow.keyboard.type('pwd');
    await mainWindow.keyboard.press('Enter');

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_EXEC);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();

    // Should contain "hegel-ide" (our project directory)
    expect(content).toContain('hegel-ide');

    await electronApp.close();
  });

  test('sequential commands work', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_READY);

    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    // First command
    await mainWindow.keyboard.type('echo "first"');
    await mainWindow.keyboard.press('Enter');
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    // Second command
    await mainWindow.keyboard.type('echo "second"');
    await mainWindow.keyboard.press('Enter');
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();

    // Both outputs should be present
    expect(content).toContain('first');
    expect(content).toContain('second');

    await electronApp.close();
  });
});

test.describe('Terminal Tab Management', () => {
  test('default terminal tab is closeable', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Find the close button on the default terminal tab in right pane
    const closeButton = await mainWindow.locator('.right-pane .tab .close-tab').first();
    expect(await closeButton.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('closing all terminals shows "Open Terminal" button', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Close the default terminal
    const closeButton = await mainWindow.locator('.right-pane .tab.active .close-tab').first();
    await closeButton.click();

    // Justified: waiting for tab close animation

    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Verify "Open Terminal" button appears
    const openTerminalButton = await mainWindow.locator('.open-terminal-button');
    expect(await openTerminalButton.isVisible()).toBe(true);
    expect(await openTerminalButton.textContent()).toContain('Open Terminal');

    await electronApp.close();
  });

  test('clicking "Open Terminal" creates new terminal', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Close the default terminal
    const closeButton = await mainWindow.locator('.right-pane .tab.active .close-tab').first();
    await closeButton.click();

    // Justified: waiting for tab close animation

    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Click "Open Terminal" button
    const openTerminalButton = await mainWindow.locator('.open-terminal-button');
    await openTerminalButton.click();

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_EXEC_FAST);

    // Verify new terminal exists
    const xtermElement = await mainWindow.locator('.xterm');
    expect(await xtermElement.count()).toBeGreaterThan(0);

    // Verify terminal tab exists
    const terminalTab = await mainWindow.locator('.right-pane .tab');
    expect(await terminalTab.count()).toBe(1);

    await electronApp.close();
  });

  test('reopened terminal is functional', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Close the default terminal
    const closeButton = await mainWindow.locator('.right-pane .tab.active .close-tab').first();
    await closeButton.click();

    // Justified: waiting for tab close animation

    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Reopen terminal
    const openTerminalButton = await mainWindow.locator('.open-terminal-button');
    await openTerminalButton.click();

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Try executing a command
    const terminalContainer = await mainWindow.locator('[id^="terminal-container-"]').first();
    await terminalContainer.click();

    await mainWindow.keyboard.type('echo "reopened works"');
    await mainWindow.keyboard.press('Enter');

    // Justified: waiting for terminal I/O, no reliable DOM state

    await mainWindow.waitForTimeout(TERMINAL_EXEC);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();
    expect(content).toContain('reopened works');

    await electronApp.close();
  });
});
