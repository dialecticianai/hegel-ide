const { test, expect, _electron: electron } = require('@playwright/test');
const { ALPINE_INIT } = require('./test-constants');
const fs = require('fs');
const path = require('path');

// Load fixture content
const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links');
const fixtures = {
  'index.md': fs.readFileSync(path.join(fixturesDir, 'index.md'), 'utf-8'),
  'page-a.md': fs.readFileSync(path.join(fixturesDir, 'page-a.md'), 'utf-8')
};

test('debug: click link and verify tab navigation', async () => {
  const electronApp = await electron.launch({
    args: ['.']
  });

  const firstPage = await electronApp.firstWindow();
  await firstPage.waitForLoadState('domcontentloaded');

  const windows = electronApp.windows();
  const mainWindow = windows.find(w => w.url().includes('index.html'));

  await mainWindow.waitForTimeout(ALPINE_INIT);

  // Inject all fixtures first
  await mainWindow.evaluate(({ fixtures }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    if (!alpineData.fileContents) {
      alpineData.fileContents = {};
    }
    for (const [fileName, content] of Object.entries(fixtures)) {
      const fileKey = `test-project:${fileName}`;
      alpineData.fileContents[fileKey] = {
        content: content,
        loading: false,
        error: null
      };
    }
  }, { fixtures });

  // Create tab
  await mainWindow.evaluate(() => {
    const alpineData = Alpine.$data(document.getElementById('app'));

    const projectName = 'test-project';
    const fileName = 'index.md';

    // Create tab
    const tabId = `file-${projectName}-${fileName.replace(/\//g, '-')}`;
    alpineData.leftTabs.push({
      id: tabId,
      type: 'file',
      label: 'index',
      closeable: true,
      projectName: projectName,
      filePath: fileName
    });

    alpineData.switchLeftTab(tabId);
  });

  await mainWindow.waitForTimeout(500);

  // Check what's rendered
  const hasMarkdownContent = await mainWindow.locator('.markdown-content').isVisible();
  console.log('Has markdown content:', hasMarkdownContent);

  if (hasMarkdownContent) {
    const content = await mainWindow.locator('.markdown-content').innerHTML();
    console.log('Markdown HTML:', content.substring(0, 200));
  }

  // Check all divs
  const allDivs = await mainWindow.locator('.tab-content > div').count();
  console.log('Total divs in tab-content:', allDivs);

  // Get the actual HTML of the file tab content
  const fileTabContent = await mainWindow.evaluate(() => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    const fileTab = alpineData.leftTabs.find(t => t.type === 'file');
    return {
      activeLeftTab: alpineData.activeLeftTab,
      fileContentsKeys: Object.keys(alpineData.fileContents || {}),
      tabsCount: alpineData.leftTabs.length,
      fileTab: fileTab
    };
  });
  console.log('File tab content state:', JSON.stringify(fileTabContent, null, 2));

  // Now click the link to page-a.md
  console.log('\n=== CLICKING LINK ===');
  const linkToA = await mainWindow.locator('.markdown-content a[href="page-a.md"]');
  console.log('Link exists:', await linkToA.count());

  await linkToA.click();
  await mainWindow.waitForTimeout(500);

  // Check if window still exists
  const isClosed = mainWindow.isClosed();
  console.log('Window closed after click?', isClosed);

  const urlAfterClick = mainWindow.url();
  console.log('URL after click:', urlAfterClick);

  if (!isClosed) {
    try {
      // Check state after click
      const stateAfterClick = await mainWindow.evaluate(() => {
        if (typeof Alpine === 'undefined') {
          return { error: 'Alpine is undefined' };
        }
        const appEl = document.getElementById('app');
        if (!appEl) {
          return { error: 'app element not found' };
        }
        const alpineData = Alpine.$data(appEl);
        return {
          tabCount: alpineData.leftTabs.length,
          tabs: alpineData.leftTabs.map(t => ({ id: t.id, label: t.label, type: t.type })),
          activeTab: alpineData.activeLeftTab,
          fileContentsKeys: Object.keys(alpineData.fileContents || {})
        };
      });
      console.log('State after click:', JSON.stringify(stateAfterClick, null, 2));
    } catch (error) {
      console.log('Error checking state:', error.message);
    }
  }

  await electronApp.close();
});
