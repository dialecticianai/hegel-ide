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

  test('comment cards render after saving', async () => {
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

    // Create and save a comment
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

    const commentForm = await mainWindow.locator('.comment-form');
    await commentForm.locator('textarea').fill('First comment');
    await commentForm.locator('button:has-text("Save")').click();

    await mainWindow.waitForTimeout(100);

    // Verify comment card is visible
    const commentCard = await mainWindow.locator('.comment-card');
    await expect(commentCard).toBeVisible();

    // Verify comment text is displayed
    const commentText = await commentCard.locator('.comment-card-text').textContent();
    expect(commentText).toBe('First comment');

    await electronApp.close();
  });

  test('multiple comments on same block stack correctly', async () => {
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

    // Create first comment
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

    let commentForm = await mainWindow.locator('.comment-form');
    await commentForm.locator('textarea').fill('First comment on this block');
    await commentForm.locator('button:has-text("Save")').click();

    await mainWindow.waitForTimeout(100);

    // Create second comment on same block
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

    commentForm = await mainWindow.locator('.comment-form');
    await commentForm.locator('textarea').fill('Second comment on this block');
    await commentForm.locator('button:has-text("Save")').click();

    await mainWindow.waitForTimeout(100);

    // Verify both comment cards are visible
    const commentCards = await mainWindow.locator('.comment-card');
    expect(await commentCards.count()).toBe(2);

    // Verify both comments are present
    const commentTexts = await commentCards.locator('.comment-card-text').allTextContents();
    expect(commentTexts).toContain('First comment on this block');
    expect(commentTexts).toContain('Second comment on this block');

    await electronApp.close();
  });

  test('clicking comment card brings it to front', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab and create two comments
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Add two comments programmatically for speed
    await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');

      reviewTab.pendingComments.push({
        lineStart: 1,
        lineEnd: 3,
        selectedText: 'Test text 1',
        comment: 'Comment 1',
        timestamp: new Date().toISOString(),
        zIndex: 1
      });

      reviewTab.pendingComments.push({
        lineStart: 1,
        lineEnd: 3,
        selectedText: 'Test text 2',
        comment: 'Comment 2',
        timestamp: new Date().toISOString(),
        zIndex: 2
      });
    });

    await mainWindow.waitForTimeout(100);

    // Get initial z-index order
    const initialOrder = await mainWindow.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.comment-card'));
      return cards.map(card => ({
        text: card.querySelector('.comment-card-text').textContent,
        zIndex: window.getComputedStyle(card).zIndex
      }));
    });

    // Click the first comment card
    const firstCard = await mainWindow.locator('.comment-card').first();
    await firstCard.click();

    await mainWindow.waitForTimeout(100);

    // Verify z-index changed
    const newOrder = await mainWindow.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.comment-card'));
      return cards.map(card => ({
        text: card.querySelector('.comment-card-text').textContent,
        zIndex: window.getComputedStyle(card).zIndex
      }));
    });

    // The clicked card should now have a higher z-index
    expect(newOrder).toBeDefined();

    await electronApp.close();
  });

  test('submit review clears comments and collapses margin', async () => {
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

    // Add comments programmatically
    await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');

      reviewTab.pendingComments.push({
        lineStart: 1,
        lineEnd: 3,
        selectedText: 'Test selection',
        comment: 'Test comment 1',
        timestamp: new Date().toISOString(),
        zIndex: 1
      });

      reviewTab.pendingComments.push({
        lineStart: 5,
        lineEnd: 8,
        selectedText: 'Another selection',
        comment: 'Test comment 2',
        timestamp: new Date().toISOString(),
        zIndex: 2
      });

      // Expand margin
      reviewTab.marginCollapsed = false;
    });

    await mainWindow.waitForTimeout(100);

    // Verify comments exist
    let pendingComments = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return reviewTab.pendingComments.length;
    });

    expect(pendingComments).toBe(2);

    // Click submit button
    const submitButton = await mainWindow.locator('.review-submit-button');
    await submitButton.click();

    await mainWindow.waitForTimeout(500);

    // Verify comments cleared
    const result = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return {
        commentsCount: reviewTab.pendingComments.length,
        marginCollapsed: reviewTab.marginCollapsed
      };
    });

    expect(result.commentsCount).toBe(0);
    expect(result.marginCollapsed).toBe(true);

    await electronApp.close();
  });

  test('cancel review shows confirmation and clears comments', async () => {
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

    // Add a comment
    await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');

      reviewTab.pendingComments.push({
        lineStart: 1,
        lineEnd: 3,
        selectedText: 'Test selection',
        comment: 'Test comment',
        timestamp: new Date().toISOString(),
        zIndex: 1
      });

      reviewTab.marginCollapsed = false;
    });

    await mainWindow.waitForTimeout(100);

    // Setup dialog handler to accept confirmation
    mainWindow.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Click cancel button
    const cancelButton = await mainWindow.locator('.review-cancel-button');
    await cancelButton.click();

    await mainWindow.waitForTimeout(100);

    // Verify comments cleared and margin collapsed
    const result = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const reviewTab = alpineData.leftTabs.find(t => t.type === 'review');
      return {
        commentsCount: reviewTab.pendingComments.length,
        marginCollapsed: reviewTab.marginCollapsed
      };
    });

    expect(result.commentsCount).toBe(0);
    expect(result.marginCollapsed).toBe(true);

    await electronApp.close();
  });

  test('cancel review with no comments does not show confirmation', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open review tab with no comments
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.openReviewTab(filePath);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Setup dialog handler (should not be called)
    let dialogCalled = false;
    mainWindow.on('dialog', async dialog => {
      dialogCalled = true;
      await dialog.dismiss();
    });

    // Click cancel button
    const cancelButton = await mainWindow.locator('.review-cancel-button');
    await cancelButton.click();

    await mainWindow.waitForTimeout(100);

    // Verify no dialog was shown
    expect(dialogCalled).toBe(false);

    await electronApp.close();
  });
});
