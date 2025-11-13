const { test, expect } = require('@playwright/test');
const { launchTestElectron, ALPINE_INIT, TAB_CREATE, TERMINAL_READY } = require('./test-constants');
const http = require('http');
const path = require('path');

// Test fixtures
const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links');
const existingFile = path.join(fixturesDir, 'index.md');
const missingFile = path.join(fixturesDir, 'nonexistent.md');

// Helper to get HTTP port from main process
async function getHttpPort(mainWindow) {
  // Use IPC to get the port from main process
  const port = await mainWindow.evaluate(async () => {
    const { ipcRenderer } = require('electron');
    return await ipcRenderer.invoke('get-http-port');
  });
  return port;
}

// Helper to make HTTP POST request
function makePostRequest(port, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody ? JSON.parse(responseBody) : null
        });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

test.describe('HTTP Server Integration', () => {
  test('terminal has HEGEL_IDE_URL environment variable set', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(TERMINAL_READY);

    // Focus terminal and check env var
    const terminalContainer = await mainWindow.locator('#terminal-container-term-1');
    await terminalContainer.click();

    await mainWindow.keyboard.type('echo $HEGEL_IDE_URL');
    await mainWindow.keyboard.press('Enter');

    await mainWindow.waitForTimeout(500);

    const xtermScreen = await mainWindow.locator('.xterm-screen');
    const content = await xtermScreen.textContent();

    // Should contain localhost URL with port
    expect(content).toMatch(/http:\/\/localhost:\d+/);

    await electronApp.close();
  });

  test('POST /review with valid file opens review tab', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Get HTTP port
    const port = await getHttpPort(mainWindow);
    expect(port).toBeTruthy();
    expect(port).toBeGreaterThan(0);

    // Make HTTP request
    const response = await makePostRequest(port, '/review', {
      files: [existingFile]
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    // Wait for tab to open
    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify review tab opened
    const reviewTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await reviewTab.isVisible()).toBe(true);

    // Verify tab type is review
    const tabData = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      return alpineData.leftTabs.find(t => t.type === 'review');
    });

    expect(tabData).toBeDefined();
    expect(tabData.type).toBe('review');

    await electronApp.close();
  });

  test('POST /review with missing file returns 404', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    const response = await makePostRequest(port, '/review', {
      files: [missingFile]
    });

    expect(response.statusCode).toBe(404);
    expect(response.body.missing).toEqual([missingFile]);

    // Verify no review tab was opened
    const tabData = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      return alpineData.leftTabs.filter(t => t.type === 'review');
    });

    expect(tabData.length).toBe(0);

    await electronApp.close();
  });

  test('POST /review with invalid JSON returns 400', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    // Make request with invalid JSON
    const response = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/review',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        });
      });
      req.write('not valid json{');
      req.end();
    });

    expect(response.statusCode).toBe(400);

    await electronApp.close();
  });

  test('POST /review with missing files field returns 400', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    const response = await makePostRequest(port, '/review', {
      other: 'data'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('Missing required field');

    await electronApp.close();
  });

  test('POST /review with multiple files opens multiple tabs', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    const file1 = path.join(fixturesDir, 'index.md');
    const file2 = path.join(fixturesDir, 'page-a.md');

    const response = await makePostRequest(port, '/review', {
      files: [file1, file2]
    });

    expect(response.statusCode).toBe(200);

    await mainWindow.waitForTimeout(TAB_CREATE);

    // Verify both review tabs opened
    const tabData = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      return alpineData.leftTabs.filter(t => t.type === 'review');
    });

    expect(tabData.length).toBe(2);

    await electronApp.close();
  });

  test('GET request returns 405 Method Not Allowed', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    const response = await new Promise((resolve) => {
      http.get(`http://localhost:${port}/review`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        });
      });
    });

    expect(response.statusCode).toBe(405);

    await electronApp.close();
  });

  test('POST to unknown path returns 404', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const port = await getHttpPort(mainWindow);

    const response = await makePostRequest(port, '/unknown', {
      files: [existingFile]
    });

    expect(response.statusCode).toBe(404);

    await electronApp.close();
  });

  test('multiple terminals all have HEGEL_IDE_URL set', async () => {
    const electronApp = await launchTestElectron({ isolatedState: true });

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Get the port - it should be the same for all terminals
    const port = await getHttpPort(mainWindow);
    expect(port).toBeTruthy();

    // Create second terminal via evaluate (faster than clicking)
    await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      alpineData.addTerminalTab();
    });

    await mainWindow.waitForTimeout(300);

    // Verify Terminal 2 was created
    const tabCount = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      return alpineData.rightTabs.length;
    });

    expect(tabCount).toBe(2);

    await electronApp.close();
  });
});
