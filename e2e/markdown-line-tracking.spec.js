const { test, expect } = require('@playwright/test');
const { launchTestElectron, ALPINE_INIT } = require('./test-constants');
const path = require('path');
const fs = require('fs');

test.describe('Markdown Line Tracking Module', () => {
  test('parseMarkdownWithLines works in Electron context', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Test the module in browser context via globally exposed function
    const result = await mainWindow.evaluate(() => {
      // Test with sample markdown
      const markdown = `# Heading One

Paragraph text spanning
multiple lines.

## Heading Two

- List item one
- List item two`;

      return window.HegelIDE.parseMarkdownWithLines(markdown, 'array');
    });

    // Verify results
    expect(result).toHaveLength(4);

    // Verify heading at line 1
    expect(result[0]).toMatchObject({
      type: 'heading',
      lineStart: 1,
      lineEnd: 1
    });
    expect(result[0].html).toContain('<h1>Heading One</h1>');

    // Verify paragraph at lines 3-4
    expect(result[1]).toMatchObject({
      type: 'paragraph',
      lineStart: 3,
      lineEnd: 4
    });

    // Verify heading at line 6
    expect(result[2]).toMatchObject({
      type: 'heading',
      lineStart: 6,
      lineEnd: 6
    });

    // Verify list at lines 8-9
    expect(result[3]).toMatchObject({
      type: 'list',
      lineStart: 8,
      lineEnd: 9
    });

    await electronApp.close();
  });

  test('parseMarkdownWithLines generates correct HTML with data attributes', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Inject markdown with line tracking into DOM
    await mainWindow.evaluate(() => {
      const markdown = `# Test Heading

Test paragraph.`;

      const html = window.HegelIDE.parseMarkdownWithLines(markdown, 'html');

      // Inject into a test container
      const container = document.createElement('div');
      container.id = 'line-tracking-test';
      container.innerHTML = html;
      document.body.appendChild(container);
    });

    // Verify DOM structure
    const blocks = await mainWindow.locator('#line-tracking-test .markdown-block');
    const count = await blocks.count();
    expect(count).toBe(2);

    // Verify first block (heading)
    const firstBlock = blocks.nth(0);
    await expect(firstBlock).toHaveAttribute('data-line-start', '1');
    await expect(firstBlock).toHaveAttribute('data-line-end', '1');
    await expect(firstBlock).toHaveAttribute('data-type', 'heading');
    await expect(firstBlock.locator('h1')).toContainText('Test Heading');

    // Verify second block (paragraph)
    const secondBlock = blocks.nth(1);
    await expect(secondBlock).toHaveAttribute('data-line-start', '3');
    await expect(secondBlock).toHaveAttribute('data-line-end', '3');
    await expect(secondBlock).toHaveAttribute('data-type', 'paragraph');

    await electronApp.close();
  });

  test('findMarkdownBlock works with DOM selection', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Setup: Inject markdown with line tracking
    await mainWindow.evaluate(() => {
      const markdown = `# Test

Content here.`;

      const html = window.HegelIDE.parseMarkdownWithLines(markdown, 'html');
      const container = document.createElement('div');
      container.id = 'find-block-test';
      container.innerHTML = html;
      document.body.appendChild(container);
    });

    // Test findMarkdownBlock
    const blockInfo = await mainWindow.evaluate(() => {
      // Find a paragraph element inside a markdown-block
      const paragraph = document.querySelector('#find-block-test .markdown-block p');
      return window.HegelIDE.findMarkdownBlock(paragraph);
    });

    // Verify block info extraction
    expect(blockInfo).toBeDefined();
    expect(blockInfo.lineStart).toBe(3);
    expect(blockInfo.lineEnd).toBe(3);
    expect(blockInfo.blockType).toBe('paragraph');

    await electronApp.close();
  });
});
