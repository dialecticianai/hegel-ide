const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Terminal Presence', () => {
  test('terminal container exists', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Find terminal container
    const terminalContainer = await mainWindow.locator('#terminal-container');
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
    await mainWindow.waitForTimeout(500);

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

    const terminalContainer = await mainWindow.locator('#terminal-container');
    const boundingBox = await terminalContainer.boundingBox();

    // Container should have non-zero dimensions
    expect(boundingBox.width).toBeGreaterThan(0);
    expect(boundingBox.height).toBeGreaterThan(0);

    await electronApp.close();
  });
});
