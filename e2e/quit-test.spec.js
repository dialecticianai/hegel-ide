const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');

test.describe('Quit Confirmation Test', () => {
  test('app closes without confirmation dialog in test mode', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    // Should close immediately without dialog
    await electronApp.close();

    // If we get here without hanging, it worked
    expect(true).toBe(true);
  });
});
