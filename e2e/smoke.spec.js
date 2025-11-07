const { test, expect, _electron: electron } = require('@playwright/test');

test('smoke test - app launches and window appears', async () => {
  // Launch Electron app
  const electronApp = await electron.launch({
    args: ['.'],
    timeout: 30000
  });

  // Get first window (may be DevTools since we open it automatically)
  const firstPage = await electronApp.firstWindow();
  await firstPage.waitForLoadState('domcontentloaded');

  // Get all windows and find the main app window (not DevTools)
  const windows = electronApp.windows();
  const mainWindow = windows.find(w => w.url().includes('index.html')) || windows[0];

  // Verify window title
  const title = await mainWindow.title();
  expect(title).toBe('Hegel IDE');

  // Close app
  await electronApp.close();
});
