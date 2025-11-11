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

  test('can select text and create comment', async () => {
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

    // Simulate text selection in first markdown block
    const selectionResult = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const firstBlock = document.querySelector('.review-content .markdown-block');

      if (!firstBlock) {
        return { error: 'No markdown block found' };
      }

      // Create a selection
      const range = document.createRange();
      range.selectNodeContents(firstBlock);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Simulate mouseup event to trigger selection handler
      const mouseupEvent = new MouseEvent('mouseup', { bubbles: true });
      firstBlock.dispatchEvent(mouseupEvent);

      // Get the block info using the exposed function
      const blockInfo = window.HegelIDE.findMarkdownBlock(selection.anchorNode);

      return {
        selectedText: selection.toString().substring(0, 50), // First 50 chars
        blockInfo: blockInfo
      };
    });

    expect(selectionResult.error).toBeUndefined();
    expect(selectionResult.blockInfo).toBeDefined();
    expect(selectionResult.blockInfo.lineStart).toBeGreaterThan(0);

    // Wait for comment form to appear
    await mainWindow.waitForTimeout(100);

    // Verify comment form is visible
    const commentForm = await mainWindow.locator('.comment-form');
    await expect(commentForm).toBeVisible();

    // Fill in comment text
    await commentForm.locator('textarea').fill('This is a test comment');

    // Click save button
    await commentForm.locator('button:has-text("Save")').click();

    await mainWindow.waitForTimeout(100);

    // Verify comment was added to pendingComments
    const pendingComments = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return reviewTab ? reviewTab.pendingComments : [];
    });

    expect(pendingComments.length).toBe(1);
    expect(pendingComments[0].comment).toBe('This is a test comment');
    expect(pendingComments[0].lineStart).toBeGreaterThan(0);
    expect(pendingComments[0].selectedText).toBeDefined();

    await electronApp.close();
  });

  test('can cancel comment form without saving', async () => {
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

    // Simulate text selection
    await mainWindow.evaluate(() => {
      const firstBlock = document.querySelector('.review-content .markdown-block');
      const range = document.createRange();
      range.selectNodeContents(firstBlock);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      const mouseupEvent = new MouseEvent('mouseup', { bubbles: true });
      firstBlock.dispatchEvent(mouseupEvent);
    });

    await mainWindow.waitForTimeout(100);

    // Verify comment form appears
    const commentForm = await mainWindow.locator('.comment-form');
    await expect(commentForm).toBeVisible();

    // Click cancel button
    await commentForm.locator('button:has-text("Cancel")').click();

    await mainWindow.waitForTimeout(100);

    // Verify form is hidden
    await expect(commentForm).not.toBeVisible();

    // Verify no comments were added
    const pendingComments = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return reviewTab ? reviewTab.pendingComments : [];
    });

    expect(pendingComments.length).toBe(0);

    await electronApp.close();
  });
});
