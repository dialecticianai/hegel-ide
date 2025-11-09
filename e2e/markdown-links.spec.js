const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { ALPINE_INIT, TAB_CREATE } = require('./test-constants');
const fs = require('fs');
const path = require('path');

// Load fixture content
const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links');
const fixtures = {
  'index.md': fs.readFileSync(path.join(fixturesDir, 'index.md'), 'utf-8'),
  'page-a.md': fs.readFileSync(path.join(fixturesDir, 'page-a.md'), 'utf-8'),
  'page-b.md': fs.readFileSync(path.join(fixturesDir, 'page-b.md'), 'utf-8'),
  'page-c.md': fs.readFileSync(path.join(fixturesDir, 'page-c.md'), 'utf-8')
};

async function injectAllFixtures(mainWindow, projectName = 'test-project') {
  // Inject all fixture content into cache so link navigation can find them
  await mainWindow.evaluate(({ projectName, fixtures }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));

    // Initialize fileContents if it doesn't exist
    if (!alpineData.fileContents) {
      alpineData.fileContents = {};
    }

    // Inject all fixtures
    for (const [fileName, content] of Object.entries(fixtures)) {
      const fileKey = `${projectName}:${fileName}`;
      alpineData.fileContents[fileKey] = {
        content: content,
        loading: false,
        error: null
      };
    }
  }, { projectName, fixtures });
}

async function openFixtureTab(mainWindow, fileName, projectName = 'test-project') {
  await mainWindow.evaluate(({ projectName, fileName }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));

    // Create tab
    const tabId = `file-${projectName}-${fileName.replace(/\//g, '-')}`;
    const fileLabel = fileName.split('/').pop().replace('.md', '');

    alpineData.leftTabs.push({
      id: tabId,
      type: 'file',
      label: fileLabel,
      closeable: true,
      projectName: projectName,
      filePath: fileName
    });

    alpineData.switchLeftTab(tabId);
  }, { projectName, fileName });

  await mainWindow.waitForTimeout(ALPINE_INIT);
}

test.describe('Markdown Link Navigation', () => {
  test('regular click on markdown link navigates current tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Open index.md tab
    await openFixtureTab(mainWindow, 'index.md');

    // Verify tab exists
    const indexTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await indexTab.isVisible()).toBe(true);

    // Click link to page-a.md
    const markdownContent = await mainWindow.locator('.markdown-content');
    const linkToA = await markdownContent.locator('a[href="page-a.md"]');
    await linkToA.click();

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Original index tab should be gone
    expect(await indexTab.isVisible()).toBe(false);

    // page-a tab should exist and be active
    const pageATab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-a' });
    expect(await pageATab.isVisible()).toBe(true);

    const hasActiveClass = await pageATab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('cmd+click on markdown link opens new tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Open index.md tab
    await openFixtureTab(mainWindow, 'index.md');

    const indexTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await indexTab.isVisible()).toBe(true);

    // Cmd+click link to page-a.md
    const markdownContent = await mainWindow.locator('.markdown-content');
    const linkToA = await markdownContent.locator('a[href="page-a.md"]');
    await linkToA.click({ modifiers: ['Meta'] });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Both tabs should exist
    expect(await indexTab.isVisible()).toBe(true);

    const pageATab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-a' });
    expect(await pageATab.isVisible()).toBe(true);

    // page-a should be active
    const hasActiveClass = await pageATab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('clicking link to already-open file switches to that tab', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Open index.md tab
    await openFixtureTab(mainWindow, 'index.md');

    // Cmd+click to open page-a in new tab
    let markdownContent = await mainWindow.locator('.markdown-content');
    const linkToA = await markdownContent.locator('a[href="page-a.md"]');
    await linkToA.click({ modifiers: ['Meta'] });
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Both tabs exist
    const indexTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    const pageATab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-a' });
    expect(await indexTab.isVisible()).toBe(true);
    expect(await pageATab.isVisible()).toBe(true);

    // Go back to index tab
    await indexTab.click();
    // TODO: review if this timeout can be replaced with a helper
    await mainWindow.waitForTimeout(200);

    // Regular click on page-a link again
    markdownContent = await mainWindow.locator('.markdown-content');
    const linkToA2 = await markdownContent.locator('a[href="page-a.md"]');
    await linkToA2.click();
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Index tab should be closed
    expect(await indexTab.isVisible()).toBe(false);

    // page-a tab should be active
    expect(await pageATab.isVisible()).toBe(true);
    const hasActiveClass = await pageATab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('external links are not intercepted', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Open index.md tab
    await openFixtureTab(mainWindow, 'index.md');

    // Get tab count before
    const tabsBefore = await mainWindow.locator('.left-pane .tab').count();

    // Click external link
    const markdownContent = await mainWindow.locator('.markdown-content');
    const externalLink = await markdownContent.locator('a[href="https://example.com"]');
    await externalLink.click();

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Tab count should not change
    const tabsAfter = await mainWindow.locator('.left-pane .tab').count();
    expect(tabsAfter).toBe(tabsBefore);

    await electronApp.close();
  });

  test('file tab can navigate to another file', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Open page-a.md tab (has link to page-b.md)
    await openFixtureTab(mainWindow, 'page-a.md');

    const pageATab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-a' });
    expect(await pageATab.isVisible()).toBe(true);

    // Click link to page-b
    const markdownContent = await mainWindow.locator('.markdown-content');
    const linkToB = await markdownContent.locator('a[href="page-b.md"]');
    await linkToB.click();

    await mainWindow.waitForTimeout(TAB_CREATE);

    // page-a tab should be gone
    expect(await pageATab.isVisible()).toBe(false);

    // page-b tab should exist and be active
    const pageBTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-b' });
    expect(await pageBTab.isVisible()).toBe(true);

    const hasActiveClass = await pageBTab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });

  test('tab position preserved during navigation', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject all fixtures into cache
    await injectAllFixtures(mainWindow);

    // Create tabs: Projects (default), hegel-ide (auto-opened), index.md, page-a.md
    await openFixtureTab(mainWindow, 'index.md');
    await openFixtureTab(mainWindow, 'page-a.md');

    // Should have 4 tabs now (Projects + hegel-ide auto-open + 2 fixtures)
    let allTabs = await mainWindow.locator('.left-pane .tab');
    let tabCount = await allTabs.count();
    expect(tabCount).toBe(4);

    // Switch to middle tab (index.md)
    const indexTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    await indexTab.click();
    // TODO: review if this timeout can be replaced with a helper
    await mainWindow.waitForTimeout(200);

    // Click link in index.md to page-b.md (only visible content)
    const linkToB = await mainWindow.locator('.markdown-content:visible a[href="page-b.md"]');
    await linkToB.click();

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Should still have 4 tabs (navigation replaces content, doesn't add tabs)
    allTabs = await mainWindow.locator('.left-pane .tab');
    tabCount = await allTabs.count();
    expect(tabCount).toBe(4);

    // Active tab should be page-b (navigated in place)
    const activeTab = await mainWindow.locator('.left-pane .tab.active');
    const activeTabText = await activeTab.locator('span').first().textContent();
    expect(activeTabText.trim()).toBe('page-b');

    await electronApp.close();
  });
});
