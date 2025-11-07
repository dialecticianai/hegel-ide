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

    // Verify main content is visible (h1 element)
    const heading = await mainWindow.locator('h1');
    expect(await heading.isVisible()).toBe(true);
    expect(await heading.textContent()).toBe('Hegel IDE');

    await electronApp.close();
  });
});
