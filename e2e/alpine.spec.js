const { test, expect, _electron: electron } = require('@playwright/test');

test.describe('Alpine.js Reactivity', () => {
  test('counter button exists in DOM', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Find counter button
    const button = await mainWindow.locator('button');
    expect(await button.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('button displays initial count', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    const button = await mainWindow.locator('button');
    const text = await button.textContent();

    // Should contain "Clicked: 0 times"
    expect(text).toContain('Clicked: 0');

    await electronApp.close();
  });

  test('clicking button increments count', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    const button = await mainWindow.locator('button');

    // Initial count
    const initialText = await button.textContent();
    expect(initialText).toContain('Clicked: 0');

    // Click button
    await button.click();

    // Wait a bit for Alpine to update
    await mainWindow.waitForTimeout(100);

    // Count should increment
    const afterClickText = await button.textContent();
    expect(afterClickText).toContain('Clicked: 1');

    await electronApp.close();
  });

  test('DOM updates reactively on multiple clicks', async () => {
    const electronApp = await electron.launch({
      args: ['.']
    });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    const button = await mainWindow.locator('button');

    // Click 3 times
    await button.click();
    await button.click();
    await button.click();

    await mainWindow.waitForTimeout(100);

    const text = await button.textContent();
    expect(text).toContain('Clicked: 3');

    await electronApp.close();
  });
});
