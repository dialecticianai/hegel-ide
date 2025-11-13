const { test, expect } = require('@playwright/test');
const { launchTestElectron, waitForTab, waitForProjectsList, waitForProjectContent, waitForAutoOpenedProject, clickFirstProject } = require('./test-constants');
const { ALPINE_INIT, TERMINAL_READY, PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE, TAB_CLOSE } = require('./test-constants');

test.describe('Tab Management', () => {
  test('initial tab UI renders correctly', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for terminal initialization (longest wait needed)
    // Justified: waiting for terminal I/O, no reliable DOM state
    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Verify left panel Projects tab
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    expect(await projectsTab.isVisible()).toBe(true);
    // Non-closeable - close button should not be visible
    const projectsCloseBtn = projectsTab.locator('.close-tab');
    expect(await projectsCloseBtn.isVisible()).toBe(false);

    // Verify right panel Terminal 1 tab
    const terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    expect(await terminal1Tab.isVisible()).toBe(true);
    // Closeable - close button should be visible
    const terminal1CloseBtn = terminal1Tab.locator('.close-tab');
    expect(await terminal1CloseBtn.isVisible()).toBe(true);

    // Verify terminal container exists in right panel
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    // Verify tabs-list has overflow-x: auto CSS
    const tabsList = await mainWindow.locator('.left-pane .tabs-list');
    const overflowX = await tabsList.evaluate(el => window.getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    // Verify add button visible in left pane
    const addBtn = await mainWindow.locator('.left-pane .add-tab');
    expect(await addBtn.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('clicking tab updates active state', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

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

  test('can add new terminal tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Click add button in right panel
    const addButton = await mainWindow.locator('.right-pane .add-tab');
    await addButton.click();

    // Wait for terminal to be created
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify we now have 2 tabs
    const allRightTabs = await mainWindow.locator('.right-pane .tab');
    expect(await allRightTabs.count()).toBe(2);

    // Verify second tab (term-2) exists and is active
    const terminal2Tab = await mainWindow.locator('.right-pane .tab').nth(1);
    expect(await terminal2Tab.isVisible()).toBe(true);
    const hasActiveClass = await terminal2Tab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    // Verify Terminal 2 has close button (closeable)
    const terminal2CloseBtn = terminal2Tab.locator('.close-tab');
    expect(await terminal2CloseBtn.isVisible()).toBe(true);

    // Verify Terminal 2 container exists
    const terminal2Container = await mainWindow.locator('#terminal-container-term-2');
    expect(await terminal2Container.isVisible()).toBe(true);

    // Verify focus is automatically set on the new terminal (can type without clicking)
    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Type command without clicking terminal first
    await mainWindow.keyboard.type('echo "auto-focused"');
    await mainWindow.keyboard.press('Enter');

    // Wait for command execution
    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Verify command output appears in Terminal 2
    const xtermScreen = await mainWindow.locator('#terminal-container-term-2 .xterm-screen');
    const content = await xtermScreen.textContent();
    expect(content).toContain('auto-focused');

    await electronApp.close();
  });

  test('can close terminal tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Add Terminal 2
    const addButton = await mainWindow.locator('.right-pane .add-tab');
    await addButton.click();
    await waitForTab(mainWindow, 'Terminal 2', 'right');

    // Verify Terminal 2 exists
    let terminal2Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 2' });
    expect(await terminal2Tab.isVisible()).toBe(true);

    // Close Terminal 2
    const closeBtn = terminal2Tab.locator('.close-tab');
    await closeBtn.click();
    // Justified: waiting for tab close animation
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

  test('project tab opens with expected UI elements', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for hegel-ide tab to auto-open
    await waitForTab(mainWindow, 'hegel-ide', 'left', PROJECT_DETAIL);

    // Switch to Projects tab to access projects list
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();

    // Wait for projects list to be visible
    // Click first project in list
    const projectName = await clickFirstProject(mainWindow);

    // Wait for project tab to appear
    await waitForTab(mainWindow, projectName);

    // Verify project tab appears
    const projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(true);

    // Verify project tab has close button
    const closeBtn = projectTab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(true);

    // Verify refresh button exists (in active tab)
    const refreshBtn = await mainWindow.locator('.tab.active .refresh-tab');
    expect(await refreshBtn.isVisible()).toBe(true);

    // Wait for project content to load
    await waitForProjectContent(mainWindow);

    // Check for either data (markdown or JSON) or error (in active tab)
    const markdownContent = await mainWindow.locator('.markdown-content:visible').first();
    const errorMsg = await mainWindow.locator('.tab-content:visible .error').first();

    const hasMarkdown = await markdownContent.isVisible().catch(() => false);
    const hasError = await errorMsg.isVisible().catch(() => false);

    // One of them should be true
    expect(hasMarkdown || hasError).toBe(true);

    await electronApp.close();
  });

  test('can close project detail tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(ALPINE_INIT);
    await waitForProjectContent(mainWindow);

    // Switch to Projects tab to access projects list
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();

    // Open project tab
    const projectName = await clickFirstProject(mainWindow);
    await waitForTab(mainWindow, projectName, 'left');

    // Verify project tab exists
    let projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(true);

    // Close project tab
    const closeBtn = projectTab.locator('.close-tab');
    await closeBtn.click();
    // Justified: waiting for tab close animation
    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Verify project tab is gone
    projectTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: projectName });
    expect(await projectTab.isVisible()).toBe(false);

    // Verify Projects tab is active
    const hasActiveClass = await projectsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });


  test('Settings tab opens with expected content and position', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(ALPINE_INIT);
    await waitForProjectContent(mainWindow);

    // Switch to Projects tab to access Settings icon
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Click Settings icon in Projects tab
    const settingsButton = await mainWindow.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await waitForTab(mainWindow, 'Settings', 'left');

    // Verify Settings tab appears
    const settingsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Settings' });
    expect(await settingsTab.isVisible()).toBe(true);

    // Verify Settings tab is active
    const hasActiveClass = await settingsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    // Verify Settings tab is at position 1 (after Projects)
    const allTabs = await mainWindow.locator('.left-pane .tab').all();
    const settingsTabIndex = await Promise.all(allTabs.map(async (tab, idx) => {
      const text = await tab.textContent();
      return text.includes('Settings') ? idx : -1;
    }));
    const settingsIndex = settingsTabIndex.find(i => i !== -1);
    expect(settingsIndex).toBe(1);

    // Verify theme selector exists in Settings content
    const themeSelector = await mainWindow.locator('.left-pane .theme-selector');
    expect(await themeSelector.isVisible()).toBe(true);

    // Verify theme selector has all options
    const options = await themeSelector.locator('option').allTextContents();
    expect(options).toContain('Auto');
    expect(options).toContain('Dark');
    expect(options).toContain('Light');
    expect(options).toContain('Synthwave');

    // Verify dev tools button exists
    const devToolsBtn = await mainWindow.locator('.left-pane .devtools-button');
    expect(await devToolsBtn.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('Settings tab is closeable', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(ALPINE_INIT);
    await waitForProjectContent(mainWindow);

    // Switch to Projects tab to access Settings icon
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Open Settings tab
    const settingsButton = await mainWindow.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await waitForTab(mainWindow, 'Settings', 'left');

    // Verify Settings tab has close button
    const settingsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Settings' });
    const closeBtn = settingsTab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(true);

    // Close Settings tab
    await closeBtn.click();
    // Justified: waiting for tab close animation
    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Verify Settings tab is gone
    expect(await settingsTab.isVisible()).toBe(false);

    // Verify Projects tab is active
    const hasActiveClass = await projectsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('Settings tab positions at index 1 when reopened', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    // Switch to Projects tab to access Settings icon
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Open Settings tab
    const settingsButton = await mainWindow.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await waitForTab(mainWindow, 'Settings', 'left');

    // Close Settings tab
    const settingsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Settings' });
    const closeBtn = settingsTab.locator('.close-tab');
    await closeBtn.click();
    // Justified: waiting for tab close animation
    await mainWindow.waitForTimeout(TAB_CLOSE);

    // Open a project detail tab (should be at index 1)
    await clickFirstProject(mainWindow);
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Switch back to Projects tab to access Settings icon
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Re-open Settings tab
    await settingsButton.click();
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify Settings tab is at position 1
    const allTabs = await mainWindow.locator('.left-pane .tab').all();
    const tabLabels = await Promise.all(allTabs.map(t => t.textContent()));
    expect(tabLabels[0]).toContain('Projects');
    expect(tabLabels[1]).toContain('Settings');

    await electronApp.close();
  });

  test('clicking ⚙️ when Settings open does not duplicate tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(ALPINE_INIT);
    await waitForProjectContent(mainWindow);

    // Switch to Projects tab to access Settings icon
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Open Settings tab
    const settingsButton = await mainWindow.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await waitForTab(mainWindow, 'Settings', 'left');

    // Switch to Projects tab to make Settings icon visible
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Click Settings icon again
    await settingsButton.click();
    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Verify only one Settings tab exists
    const settingsTabs = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Settings' }).all();
    expect(settingsTabs.length).toBe(1);

    // Verify Settings tab is active again
    const settingsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Settings' });
    const hasActiveClass = await settingsTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

});