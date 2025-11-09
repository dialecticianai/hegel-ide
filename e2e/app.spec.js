const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');

test.describe('Application Launch', () => {
  test('app launches and displays initial UI', async () => {
    const electronApp = await launchTestElectron();

    // Get first window
    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    // App should have created windows
    const windows = electronApp.windows();
    expect(windows.length).toBeGreaterThan(0);

    // Find main window
    const mainWindow = windows.find(w => w.url().includes('index.html'));
    expect(mainWindow).toBeDefined();

    // Verify correct title
    const title = await mainWindow.title();
    expect(title).toBe('Hegel IDE');

    // Wait for Alpine to initialize
    await mainWindow.waitForTimeout(500);

    // Verify split-pane content is visible
    const heading = await mainWindow.locator('.left-pane h2').filter({ hasText: 'Projects' });
    expect(await heading.isVisible()).toBe(true);
    expect(await heading.textContent()).toBe('Projects');

    await electronApp.close();
  });
});
