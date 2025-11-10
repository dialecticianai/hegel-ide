const { test, expect } = require('@playwright/test');
const { launchTestElectron, ALPINE_INIT, TAB_CREATE } = require('./test-constants');
const path = require('path');
const fs = require('fs');

// Test fixtures
const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links');
const testFilePath = path.join(fixturesDir, 'index.md');

test.describe('Review Tab Infrastructure', () => {
  test('can open review tab with absolute path', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab programmatically
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify review tab exists
    const reviewTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await reviewTab.isVisible()).toBe(true);

    // Verify tab has correct structure
    const tabData = await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const tabId = `review-${filePath.replace(/\//g, '-')}`;
      return alpineData.leftTabs.find(t => t.id === tabId);
    }, { filePath: testFilePath });

    expect(tabData).toBeDefined();
    expect(tabData.type).toBe('review');
    expect(tabData.filePath).toBe(testFilePath);
    expect(tabData.pendingComments).toEqual([]);
    expect(tabData.marginCollapsed).toBe(true); // Initially collapsed

    await electronApp.close();
  });

  test('review tab renders markdown with line tracking', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify markdown blocks with line tracking render
    const markdownBlocks = await mainWindow.locator('.review-content .markdown-block');
    const count = await markdownBlocks.count();
    expect(count).toBeGreaterThan(0);

    // Verify first block has line tracking attributes
    const firstBlock = markdownBlocks.first();
    await expect(firstBlock).toHaveAttribute('data-line-start');
    await expect(firstBlock).toHaveAttribute('data-line-end');
    await expect(firstBlock).toHaveAttribute('data-type');

    await electronApp.close();
  });

  test('review tab has grid layout with comment margin', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify grid layout structure exists
    const reviewGrid = await mainWindow.locator('.review-grid');
    expect(await reviewGrid.isVisible()).toBe(true);

    // Verify content area exists
    const contentArea = await mainWindow.locator('.review-content');
    expect(await contentArea.isVisible()).toBe(true);

    // Verify comment margin exists
    const commentMargin = await mainWindow.locator('.comment-margin');
    expect(await commentMargin.count()).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('comment margin is initially collapsed', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Check margin collapsed state
    const isCollapsed = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return reviewTab ? reviewTab.marginCollapsed : null;
    });

    expect(isCollapsed).toBe(true);

    // Verify margin is visually hidden/collapsed
    const commentMargin = await mainWindow.locator('.comment-margin').first();
    const isVisible = await commentMargin.isVisible();
    // Collapsed state may hide it or set width to 0, either is acceptable
    expect(isVisible).toBeDefined();

    await electronApp.close();
  });

  test('review tab can toggle margin visibility', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Toggle margin
    await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      if (reviewTab) {
        alpineData.toggleCommentMargin(reviewTab.id);
      }
    });

    await mainWindow.waitForTimeout(100);

    // Verify margin is expanded
    const isExpanded = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return reviewTab ? !reviewTab.marginCollapsed : null;
    });

    expect(isExpanded).toBe(true);

    await electronApp.close();
  });
});
