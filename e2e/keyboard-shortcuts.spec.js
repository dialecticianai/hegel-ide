const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { ALPINE_INIT, TAB_CREATE } = require('./test-constants');

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+1 through Cmd+9 switch tabs based on pane interaction', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Setup: Create multiple terminal tabs
    // Right pane: Terminal 1 (0), Terminal 2 (1), Terminal 3 (2)
    const addButton = await mainWindow.locator('.right-pane .add-tab');
    await addButton.click();
    await mainWindow.waitForTimeout(TAB_CREATE);
    await addButton.click();
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Test right pane: click in pane then switch through tabs with Cmd+1/2/3
    const rightPane = await mainWindow.locator('.right-pane');
    await rightPane.click();

    await mainWindow.keyboard.press('Meta+1');
    await mainWindow.waitForTimeout(100);
    let terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    expect(await terminal1Tab.evaluate(el => el.classList.contains('active'))).toBe(true);

    await mainWindow.keyboard.press('Meta+2');
    await mainWindow.waitForTimeout(100);
    let terminal2Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 2' });
    expect(await terminal2Tab.evaluate(el => el.classList.contains('active'))).toBe(true);

    await mainWindow.keyboard.press('Meta+3');
    await mainWindow.waitForTimeout(100);
    let terminal3Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 3' });
    expect(await terminal3Tab.evaluate(el => el.classList.contains('active'))).toBe(true);

    // Test left pane: click in left pane then use Cmd+1
    const leftPane = await mainWindow.locator('.left-pane');
    await leftPane.click();

    await mainWindow.keyboard.press('Meta+1');
    await mainWindow.waitForTimeout(100);
    let projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    expect(await projectsTab.evaluate(el => el.classList.contains('active'))).toBe(true);

    // Switch back to right pane and verify Cmd+2 switches Terminal 2
    await rightPane.click();
    await mainWindow.keyboard.press('Meta+2');
    await mainWindow.waitForTimeout(100);
    expect(await terminal2Tab.evaluate(el => el.classList.contains('active'))).toBe(true);

    await electronApp.close();
  });

  test('keyboard shortcuts do nothing when tab index does not exist', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Right pane starts with only Terminal 1
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    // Terminal 1 should be active
    let terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    let hasActiveClass = await terminal1Tab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    // Press Cmd+5 (no 5th terminal exists)
    await mainWindow.keyboard.press('Meta+5');
    await mainWindow.waitForTimeout(100);

    // Terminal 1 should still be active
    terminal1Tab = await mainWindow.locator('.right-pane .tab').filter({ hasText: 'Terminal 1' });
    hasActiveClass = await terminal1Tab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });
});
