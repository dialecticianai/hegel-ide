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

    // Wait for Alpine to initialize and project auto-open
    // TODO: review if this timeout can be replaced with a helper
    await mainWindow.waitForTimeout(2500);

    // Verify Projects tab exists
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    expect(await projectsTab.isVisible()).toBe(true);

    // Verify hegel-ide project tab auto-opened
    const hegelIdeTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'hegel-ide' });
    expect(await hegelIdeTab.isVisible()).toBe(true);

    await electronApp.close();
  });
});
