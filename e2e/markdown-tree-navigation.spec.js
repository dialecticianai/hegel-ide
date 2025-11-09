const { test, expect, _electron: electron } = require('@playwright/test');
const { PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE } = require('./test-constants');

test.describe('Markdown Tree Navigation', () => {
  test('clicking file in tree replaces README content', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Get initial README content
    const markdownContent = await mainWindow.locator('.markdown-content');
    const initialContent = await markdownContent.textContent();

    // Click a file in the tree (e.g., VISION.md or ARCHITECTURE.md)
    const treeFile = await mainWindow.locator('.markdown-tree-file').first();
    await treeFile.click();

    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Verify content changed
    const newContent = await markdownContent.textContent();
    expect(newContent).not.toBe(initialContent);

    await electronApp.close();
  });

  test('Cmd+Click file opens new tab', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Count initial tabs
    const initialTabCount = await mainWindow.locator('.tab').count();

    // Cmd+Click a file in the tree
    const treeFile = await mainWindow.locator('.markdown-tree-file').first();
    await treeFile.click({ modifiers: ['Meta'] }); // Meta = Cmd on Mac

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify new tab created
    const newTabCount = await mainWindow.locator('.tab').count();
    expect(newTabCount).toBe(initialTabCount + 1);

    await electronApp.close();
  });

  test('file nodes styled as links', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Check file node styling
    const treeFile = await mainWindow.locator('.markdown-tree-file').first();

    const cursor = await treeFile.evaluate(el => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toBe('pointer');

    await electronApp.close();
  });

  test('directory nodes not clickable', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Check directory node styling (should not be pointer)
    const treeDir = await mainWindow.locator('.markdown-tree-dir').first();

    const cursor = await treeDir.evaluate(el => {
      return window.getComputedStyle(el).cursor;
    });

    // Should be default cursor, not pointer
    expect(cursor).not.toBe('pointer');

    await electronApp.close();
  });

  test('current file highlighted in tree', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Initially README.md should be highlighted
    const readmeFile = await mainWindow.locator('.markdown-tree-file.active');
    expect(await readmeFile.isVisible()).toBe(true);

    const highlightedText = await readmeFile.textContent();
    expect(highlightedText).toContain('README.md');

    // Click another file
    const otherFile = await mainWindow.locator('.markdown-tree-file').filter({ hasNotText: 'README.md' }).first();
    await otherFile.click();

    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // New file should be highlighted
    const newHighlighted = await mainWindow.locator('.markdown-tree-file.active');
    const newHighlightedText = await newHighlighted.textContent();

    // Should not be README anymore
    expect(newHighlightedText).not.toContain('README.md');

    await electronApp.close();
  });

  test('file content rendered correctly after navigation', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    const hegelIdeProject = await mainWindow.locator('.projects-list li').filter({ hasText: 'hegel-ide' });
    await hegelIdeProject.click();

    await mainWindow.waitForTimeout(TAB_CREATE);
    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Click a file in the tree
    const treeFile = await mainWindow.locator('.markdown-tree-file').first();
    await treeFile.click();

    await mainWindow.waitForTimeout(PROJECT_DETAIL);

    // Verify markdown content is rendered (has HTML tags)
    const markdownContent = await mainWindow.locator('.markdown-content');
    const innerHTML = await markdownContent.innerHTML();

    // Should contain rendered HTML elements
    const hasHTML = innerHTML.includes('<h1>') || innerHTML.includes('<h2>') || innerHTML.includes('<p>');
    expect(hasHTML).toBe(true);

    await electronApp.close();
  });
});
