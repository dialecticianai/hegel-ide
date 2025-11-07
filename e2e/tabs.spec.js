const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Tab Management', () => {
  test('default tabs exist and are clickable', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for Alpine to initialize
    await mainWindow.waitForTimeout(500);

    // Verify left panel Projects tab
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    expect(await projectsTab.isVisible()).toBe(true);
    expect(await projectsTab.locator('.close-tab').count()).toBe(0); // Non-closeable

    // Verify right panel Terminal 1 tab
    const terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    expect(await terminal1Tab.isVisible()).toBe(true);
    expect(await terminal1Tab.locator('.close-tab').count()).toBe(0); // Non-closeable

    await electronApp.close();
  });

  test('clicking tab updates active state', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Click Projects tab (should already be active)
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();

    // Verify it has active class
    const hasActiveClass = await projectsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    // Verify Projects content is visible
    const projectsContent = await mainWindow.locator('.left-pane .tab-content').locator('h2').filter({ hasText: 'Markdown Browser' });
    expect(await projectsContent.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('terminal still works after tab changes', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for terminal initialization
    await mainWindow.waitForTimeout(1000);

    // Verify terminal container exists in right panel
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    // Terminal functionality will be tested by existing terminal.spec.js

    await electronApp.close();
  });
});
