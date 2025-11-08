const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Application Launch', () => {
  test('app starts without errors', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get first window
    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    // App should have created windows
    const windows = electronApp.windows();
    expect(windows.length).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('main window has correct title', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    // Find main window
    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    expect(mainWindow).toBeDefined();

    const title = await mainWindow.title();
    expect(title).toBe('Hegel IDE');

    await electronApp.close();
  });

  test('window content is visible', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    // Find main window
    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for Alpine to initialize
    await mainWindow.waitForTimeout(500);

    // Verify split-pane content is visible
    const heading = await mainWindow.locator('h2');
    expect(await heading.isVisible()).toBe(true);
    expect(await heading.textContent()).toBe('Projects');

    await electronApp.close();
  });
});
