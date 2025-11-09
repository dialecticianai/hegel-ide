const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { ALPINE_INIT, TAB_CREATE } = require('./test-constants');

test.describe('Theme System', () => {
  test('theme dropdown is visible in Settings tab', async () => {
    const electronApp = await launchTestElectron();

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab
    const settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Find theme dropdown
    const themeSelector = window.locator('.theme-selector');
    expect(await themeSelector.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('theme dropdown shows all four options', async () => {
    const electronApp = await launchTestElectron();

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab
    const settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Check all options are present
    const themeSelector = window.locator('.theme-selector');
    const options = await themeSelector.locator('option').allTextContents();

    expect(options).toContain('Auto');
    expect(options).toContain('Dark');
    expect(options).toContain('Light');
    expect(options).toContain('Synthwave');

    await electronApp.close();
  });

  test('selecting theme updates UI immediately', async () => {
    const electronApp = await launchTestElectron();

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab
    const settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Select synthwave theme
    const themeSelector = window.locator('.theme-selector');
    await themeSelector.selectOption('synthwave');

    // Wait briefly for theme to apply
    await window.waitForTimeout(100);

    // Verify body has synthwave theme class
    const bodyClasses = await window.evaluate(() => {
      return Array.from(document.body.classList);
    });

    expect(bodyClasses).toContain('theme-synthwave');

    await electronApp.close();
  });

  test('theme persists across page reload', async () => {
    const electronApp = await launchTestElectron();

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Clear localStorage first to ensure clean state
    await window.evaluate(() => {
      localStorage.removeItem('hegel-ide:theme');
    });

    // Reload to apply cleared state
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab
    let settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Set theme to light
    const themeSelector = window.locator('.theme-selector');
    await themeSelector.selectOption('light');
    await window.waitForTimeout(100);

    // Verify light theme is applied
    let bodyClasses = await window.evaluate(() => {
      return Array.from(document.body.classList);
    });
    expect(bodyClasses).toContain('theme-light');

    // Reload page to test persistence
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab again after reload
    settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Verify light theme persisted
    bodyClasses = await window.evaluate(() => {
      return Array.from(document.body.classList);
    });
    expect(bodyClasses).toContain('theme-light');

    // Verify dropdown shows light selected
    const selectedValue = await window.locator('.theme-selector').inputValue();
    expect(selectedValue).toBe('light');

    await electronApp.close();
  });

  test('theme dropdown defaults to auto on first launch', async () => {
    const electronApp = await launchTestElectron();

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Clear localStorage to simulate fresh install
    await window.evaluate(() => {
      localStorage.removeItem('hegel-ide:theme');
    });

    // Reload to apply default theme
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(ALPINE_INIT);

    // Open Settings tab
    const settingsButton = await window.locator('.left-pane .settings-icon');
    await settingsButton.click();
    await window.waitForTimeout(TAB_CREATE);

    // Check default selection
    const selectedValue = await window.locator('.theme-selector').inputValue();
    expect(selectedValue).toBe('auto');

    // Should apply either dark or light based on system preference
    const bodyClasses = await window.evaluate(() => {
      return Array.from(document.body.classList);
    });

    const hasThemeClass = bodyClasses.some(cls =>
      cls === 'theme-dark' || cls === 'theme-light'
    );
    expect(hasThemeClass).toBe(true);

    await electronApp.close();
  });
});
