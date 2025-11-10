import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toyDir = path.join(__dirname, '..');
const indexPath = 'file://' + path.join(toyDir, 'index.html');

test.describe('Markdown Line Tracking', () => {
  test('renders HTML page', async ({ page }) => {
    await page.goto(indexPath);
    // Check page title H1 (outside x-html)
    await expect(page.locator('body > div > h1').first()).toContainText('Markdown Line Tracking Renderer');
    // Check that markdown blocks are rendered
    await expect(page.locator('.markdown-block').first()).toBeVisible();
  });

  test('single-line heading has correct attributes', async ({ page }) => {
    await page.goto(indexPath);
    await page.waitForTimeout(500);

    // Find the first heading block (Heading One)
    const block = page.locator('.markdown-block[data-type="heading"]').first();
    await expect(block).toBeVisible();

    // Check data attributes - single line block
    await expect(block).toHaveAttribute('data-line-start', '1');
    await expect(block).toHaveAttribute('data-line-end', '1');
    await expect(block).toHaveAttribute('data-type', 'heading');

    // Check rendered content
    await expect(block.locator('h1')).toContainText('Heading One');
  });

  test('multi-line paragraph has correct attributes', async ({ page }) => {
    await page.goto(indexPath);
    await page.waitForTimeout(500);

    // Find the first paragraph block (lines 3-4)
    const block = page.locator('.markdown-block[data-type="paragraph"]').first();
    await expect(block).toBeVisible();

    // Check data attributes - multi-line block
    await expect(block).toHaveAttribute('data-line-start', '3');
    await expect(block).toHaveAttribute('data-line-end', '4');
    await expect(block).toHaveAttribute('data-type', 'paragraph');

    // Check rendered content
    await expect(block.locator('p')).toContainText('This is a paragraph spanning');
  });

  test('multi-block document has sequential line numbers', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => console.log('Browser log:', msg.text()));

    await page.goto(indexPath);
    await page.waitForTimeout(500);

    // Find all markdown blocks
    const blocks = page.locator('.markdown-block');
    const count = await blocks.count();

    // Expected blocks from sample.md (verified with cat -n):
    // 1. Heading One (line 1)
    // 2. Paragraph (lines 3-4)
    // 3. Heading Two (line 6)
    // 4. List (lines 8-10)
    // 5. Code (lines 12-16)
    // 6. Paragraph (line 18)
    // 7. Blockquote (lines 20-21)
    // 8. HR (line 23)
    // 9. Ordered list (lines 25-26)
    // 10. Paragraph (line 28)
    expect(count).toBe(10);

    // Verify each block has sequential line numbers
    const expectedBlocks = [
      { lineStart: 1, lineEnd: 1, type: 'heading' },
      { lineStart: 3, lineEnd: 4, type: 'paragraph' },
      { lineStart: 6, lineEnd: 6, type: 'heading' },
      { lineStart: 8, lineEnd: 10, type: 'list' },
      { lineStart: 12, lineEnd: 16, type: 'code' },
      { lineStart: 18, lineEnd: 18, type: 'paragraph' },
      { lineStart: 20, lineEnd: 21, type: 'blockquote' },
      { lineStart: 23, lineEnd: 23, type: 'hr' },
      { lineStart: 25, lineEnd: 26, type: 'list' },
      { lineStart: 28, lineEnd: 28, type: 'paragraph' }
    ];

    for (let i = 0; i < count; i++) {
      const block = blocks.nth(i);
      const expected = expectedBlocks[i];

      await expect(block).toHaveAttribute('data-line-start', expected.lineStart.toString());
      await expect(block).toHaveAttribute('data-line-end', expected.lineEnd.toString());
      await expect(block).toHaveAttribute('data-type', expected.type);
    }
  });

  test('selection detection extracts correct line range', async ({ page }) => {
    await page.goto(indexPath);
    await page.waitForTimeout(500);

    // Test selection in multi-line paragraph (lines 3-4)
    const paragraphBlock = page.locator('.markdown-block[data-type="paragraph"]').first();
    await expect(paragraphBlock).toBeVisible();

    // Select text within the paragraph
    await paragraphBlock.locator('p').selectText();

    // Execute selection helper in browser context
    const selectionInfo = await page.evaluate(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const node = selection.anchorNode;
      const blockInfo = window.findMarkdownBlock(node);
      return blockInfo;
    });

    // Verify line range extraction
    expect(selectionInfo).not.toBeNull();
    expect(selectionInfo.lineStart).toBe(3);
    expect(selectionInfo.lineEnd).toBe(4);
    expect(selectionInfo.blockType).toBe('paragraph');
  });

  test('selection works across different block types', async ({ page }) => {
    await page.goto(indexPath);
    await page.waitForTimeout(500);

    // Test heading selection
    const headingBlock = page.locator('.markdown-block[data-type="heading"]').first();
    await headingBlock.locator('h1').selectText();

    const headingInfo = await page.evaluate(() => {
      const selection = window.getSelection();
      const node = selection.anchorNode;
      return window.findMarkdownBlock(node);
    });

    expect(headingInfo.lineStart).toBe(1);
    expect(headingInfo.lineEnd).toBe(1);
    expect(headingInfo.blockType).toBe('heading');

    // Test code block selection
    const codeBlock = page.locator('.markdown-block[data-type="code"]').first();
    await codeBlock.locator('code').click();  // Click to focus
    await page.keyboard.press('Control+A');   // Select all in code block

    const codeInfo = await page.evaluate(() => {
      const selection = window.getSelection();
      const node = selection.anchorNode;
      return window.findMarkdownBlock(node);
    });

    expect(codeInfo.lineStart).toBe(12);
    expect(codeInfo.lineEnd).toBe(16);
    expect(codeInfo.blockType).toBe('code');
  });

  test('empty markdown returns empty result', async ({ page }) => {
    await page.goto(indexPath);

    // Test parseMarkdownWithLines with empty input
    const result = await page.evaluate(() => {
      return window.parseMarkdownWithLines('', 'array');
    });

    expect(result).toEqual([]);
  });

  test('whitespace-only markdown returns empty result', async ({ page }) => {
    await page.goto(indexPath);

    const result = await page.evaluate(() => {
      return window.parseMarkdownWithLines('   \n\n  \n   ', 'array');
    });

    expect(result).toEqual([]);
  });

  test('single-line document has matching start and end lines', async ({ page }) => {
    await page.goto(indexPath);

    const result = await page.evaluate(() => {
      return window.parseMarkdownWithLines('Single line.', 'array');
    });

    expect(result).toHaveLength(1);
    expect(result[0].lineStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
  });

  test('consecutive blank lines handled correctly', async ({ page }) => {
    await page.goto(indexPath);

    const markdown = `# First\n\n\n\n## Second`;
    const result = await page.evaluate((md) => {
      return window.parseMarkdownWithLines(md, 'array');
    }, markdown);

    // Should have 2 blocks with correct line positions
    expect(result).toHaveLength(2);
    expect(result[0].lineStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].type).toBe('heading');

    // Second heading should be at line 5 (after blank lines)
    expect(result[1].lineStart).toBe(5);
    expect(result[1].lineEnd).toBe(5);
    expect(result[1].type).toBe('heading');
  });

  test('findMarkdownBlock returns null for non-block nodes', async ({ page }) => {
    await page.goto(indexPath);

    const result = await page.evaluate(() => {
      // Try to find block from body element (not inside a markdown-block)
      const bodyElement = document.querySelector('body > div > h1');
      return window.findMarkdownBlock(bodyElement);
    });

    expect(result).toBeNull();
  });
});
