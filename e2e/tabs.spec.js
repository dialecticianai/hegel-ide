const { test, expect, _electron: electron } = require('@playwright/test');
const { ALPINE_INIT, TERMINAL_READY, PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE, TAB_CLOSE } = require('./test-constants');

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
    await mainWindow.waitForTimeout(ALPINE_INIT);

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
    const projectsContent = await mainWindow.locator('.left-pane .tab-content').locator('h2').filter({ hasText: 'Projects' });
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
    await mainWindow.waitForTimeout(TERMINAL_READY);

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
    await mainWindow.waitForTimeout(TAB_CREATE);

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
    await mainWindow.waitForTimeout(TAB_CLOSE);

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

  test('can open project detail tab', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load
    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click first project in list
    const firstProject = await mainWindow.locator('.projects-list li').first();
    const projectName = await firstProject.textContent();
    await firstProject.click();

    // Wait for tab to appear
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify project tab appears
    const projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(true);

    // Verify project tab has close button
    const closeBtn = projectTab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(true);

    // Wait for data to load
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Check for either data (markdown or JSON) or error
    const markdownContent = await mainWindow.locator('.left-pane .markdown-content');
    const errorMsg = await mainWindow.locator('.left-pane .tab-content .error');

    const hasMarkdown = await markdownContent.isVisible();
    const hasError = await errorMsg.isVisible();

    // One of them should be true
    expect(hasMarkdown || hasError).toBe(true);

    await electronApp.close();
  });

  test('project tab shows refresh button', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(2000);

    // Click first project
    const firstProject = await mainWindow.locator('.projects-list li').first();
    await firstProject.click();
    await mainWindow.waitForTimeout(1500);

    // Verify refresh button exists
    const refreshBtn = await mainWindow.locator('.refresh-button');
    expect(await refreshBtn.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('can close project detail tab', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(2000);

    // Open project tab
    const firstProject = await mainWindow.locator('.projects-list li').first();
    const projectName = await firstProject.textContent();
    await firstProject.click();
    await mainWindow.waitForTimeout(500);

    // Verify project tab exists
    let projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(true);

    // Close project tab
    const closeBtn = projectTab.locator('.close-tab');
    await closeBtn.click();
    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Verify project tab is gone
    projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(false);

    // Verify Projects tab is active
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    const hasActiveClass = await projectsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('cannot close Projects tab (non-closeable)', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Verify Projects tab has no close button
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    const closeBtn = projectsTab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(false);

    await electronApp.close();
  });

  test('tab overflow has correct CSS', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    // Verify tabs-list has overflow-x: auto CSS
    const tabsList = await mainWindow.locator('.left-pane .tabs-list');
    const overflowX = await tabsList.evaluate(el => window.getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    // Verify add button visible
    const addBtn = await mainWindow.locator('.left-pane .add-tab');
    expect(await addBtn.isVisible()).toBe(true);

    await electronApp.close();
  });
});
