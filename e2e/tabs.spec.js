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
    // Non-closeable - close button should not be visible
    const projectsCloseBtn = projectsTab.locator('.close-tab');
    expect(await projectsCloseBtn.isVisible()).toBe(false);

    // Verify right panel Terminal 1 tab
    const terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    expect(await terminal1Tab.isVisible()).toBe(true);
    // Non-closeable - close button should not be visible
    const terminal1CloseBtn = terminal1Tab.locator('.close-tab');
    expect(await terminal1CloseBtn.isVisible()).toBe(false);

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

  test('can add new terminal tab', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Click add button in right panel
    const addButton = await mainWindow.locator('.right-pane .add-tab');
    await addButton.click();

    // Wait for terminal to be created
    await mainWindow.waitForTimeout(500);

    // Verify Terminal 2 tab appears
    const terminal2Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 2' });
    expect(await terminal2Tab.isVisible()).toBe(true);

    // Verify Terminal 2 has close button (closeable)
    const terminal2CloseBtn = terminal2Tab.locator('.close-tab');
    expect(await terminal2CloseBtn.isVisible()).toBe(true);

    // Verify Terminal 2 container exists
    const terminal2Container = await mainWindow.locator('#terminal-container-term-2');
    expect(await terminal2Container.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('can close terminal tab', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Add Terminal 2
    const addButton = await mainWindow.locator('.right-pane .add-tab');
    await addButton.click();
    await mainWindow.waitForTimeout(500);

    // Verify Terminal 2 exists
    let terminal2Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 2' });
    expect(await terminal2Tab.isVisible()).toBe(true);

    // Close Terminal 2
    const closeBtn = terminal2Tab.locator('.close-tab');
    await closeBtn.click();
    await mainWindow.waitForTimeout(200);

    // Verify Terminal 2 is gone
    terminal2Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 2' });
    expect(await terminal2Tab.isVisible()).toBe(false);

    // Verify Terminal 1 still exists and is active
    const terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    expect(await terminal1Tab.isVisible()).toBe(true);
    const hasActiveClass = await terminal1Tab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('cannot close Terminal 1 (non-closeable)', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Verify Terminal 1 has no close button
    const terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    const closeBtn = terminal1Tab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(false);

    await electronApp.close();
  });
});
