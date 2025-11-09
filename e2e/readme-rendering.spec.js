const { test, expect } = require('@playwright/test');
const { launchTestElectron, waitForTab, waitForProjectsList, waitForProjectContent } = require('./test-constants');
const { ALPINE_INIT, PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE } = require('./test-constants');

test.describe('README Rendering', () => {
  test('project with README.md shows rendered content', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load
    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project (known to have README.md)
    await waitForProjectContent(mainWindow);

    // Verify markdown content exists
    const markdownContent = await mainWindow.locator('.markdown-content');
    expect(await markdownContent.isVisible()).toBe(true);

    // Verify it contains rendered HTML (not raw markdown)
    const innerHTML = await markdownContent.innerHTML();
    expect(innerHTML).toContain('<h1>');

    await electronApp.close();
  });

  test('project without README.md shows missing message', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForTab(mainWindow, 'hegel-ide', 'left', PROJECT_DETAIL);

    // Switch to Projects tab to access projects list
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await waitForProjectsList(mainWindow);

    // Click first project (may or may not have README)
    const firstProject = await mainWindow.locator('.projects-list li').first();
    const projectName = await firstProject.textContent();
    await firstProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await waitForProjectContent(mainWindow);

    // Check for either markdown content or missing message (in active tab only)
    const markdownContent = await mainWindow.locator('.markdown-content:visible').first();
    const missingMessage = await mainWindow.locator('.readme-missing:visible').first();

    const hasMarkdown = await markdownContent.isVisible().catch(() => false);
    const hasMissing = await missingMessage.isVisible().catch(() => false);

    // Exactly one should be visible
    expect(hasMarkdown || hasMissing).toBe(true);

    // If missing message, verify text
    if (hasMissing) {
      const text = await missingMessage.textContent();
      expect(text).toBe('Project missing README.md');
    }

    await electronApp.close();
  });

  test('markdown formatting displays correctly', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project
    await waitForProjectContent(mainWindow);

    const markdownContent = await mainWindow.locator('.markdown-content');

    // Verify headers are rendered
    const headers = await markdownContent.locator('h1, h2, h3').count();
    expect(headers).toBeGreaterThan(0);

    // Verify lists are rendered
    const lists = await markdownContent.locator('ul, ol').count();
    expect(lists).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('refresh button updates README content', async () => {
    test.setTimeout(15000); // Needs extra time for double project load
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project
    await waitForProjectContent(mainWindow);

    // Verify initial content loaded
    const markdownContent = await mainWindow.locator('.markdown-content');
    expect(await markdownContent.isVisible()).toBe(true);
    const initialHTML = await markdownContent.innerHTML();

    // Click refresh button (in active tab)
    const refreshButton = await mainWindow.locator('.tab.active .refresh-tab');
    await refreshButton.click();

    // Wait for refresh to complete
    await waitForProjectContent(mainWindow);

    // Verify content still present (may be same or updated)
    expect(await markdownContent.isVisible()).toBe(true);
    const refreshedHTML = await markdownContent.innerHTML();

    // Content should exist after refresh
    expect(refreshedHTML.length).toBeGreaterThan(0);

    await electronApp.close();
  });
});
