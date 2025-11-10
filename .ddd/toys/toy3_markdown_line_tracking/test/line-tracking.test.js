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
    await expect(page.locator('h1')).toContainText('Markdown Line Tracking Renderer');
  });

  test('single paragraph has correct line attributes', async ({ page }) => {
    // Capture console messages for debugging
    page.on('console', msg => console.log('Browser:', msg.text()));
    page.on('pageerror', err => console.error('Page error:', err));

    await page.goto(indexPath);

    // Wait a bit for Alpine to initialize
    await page.waitForTimeout(500);

    // Check rendered content
    const content = await page.locator('div[x-html]').innerHTML();
    console.log('Rendered content:', content);

    // Find the markdown-block element
    const block = page.locator('.markdown-block').first();
    await expect(block).toBeVisible();

    // Check data attributes
    await expect(block).toHaveAttribute('data-line-start', '1');
    await expect(block).toHaveAttribute('data-line-end', '1');
    await expect(block).toHaveAttribute('data-type', 'paragraph');

    // Check rendered content
    await expect(block.locator('p')).toBeVisible();
  });
});
