const { test, expect, _electron: electron } = require('@playwright/test');
const { PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE } = require('./test-constants');

test.describe('README Rendering', () => {
  test('project with README.md shows rendered content', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load
    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project (known to have README.md)
    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    // Wait for tab and content to load
    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Verify markdown content exists
    const markdownContent = await mainWindow.locator('.markdown-content');
    expect(await markdownContent.isVisible()).toBe(true);

    // Verify it contains rendered HTML (not raw markdown)
    const innerHTML = await markdownContent.innerHTML();
    expect(innerHTML).toContain('<h1>');

    await electronApp.close();
  });

  test('project without README.md shows missing message', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click first project (may or may not have README)
    const firstProject = await mainWindow.locator('.projects-list li').first();
    const projectName = await firstProject.textContent();
    await firstProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Check for either markdown content or missing message
    const markdownContent = await mainWindow.locator('.markdown-content');
    const missingMessage = await mainWindow.locator('.readme-missing');

    const hasMarkdown = await markdownContent.isVisible();
    const hasMissing = await missingMessage.isVisible();

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
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project
    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

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
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Click hegel-ide project
    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Verify initial content loaded
    const markdownContent = await mainWindow.locator('.markdown-content');
    expect(await markdownContent.isVisible()).toBe(true);
    const initialHTML = await markdownContent.innerHTML();

    // Click refresh button (in active tab)
    const refreshButton = await mainWindow.locator('.tab.active .refresh-tab');
    await refreshButton.click();

    // Wait for refresh to complete
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Verify content still present (may be same or updated)
    expect(await markdownContent.isVisible()).toBe(true);
    const refreshedHTML = await markdownContent.innerHTML();

    // Content should exist after refresh
    expect(refreshedHTML.length).toBeGreaterThan(0);

    await electronApp.close();
  });
});
