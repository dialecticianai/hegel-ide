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

test('minimal: click markdown link', async () => {
  const electronApp = await electron.launch({
    args: ['.']
  });

  const firstPage = await electronApp.firstWindow();
  await firstPage.waitForLoadState('domcontentloaded');

  const windows = electronApp.windows();
  const mainWindow = windows.find(w => w.url().includes('index.html'));

  await mainWindow.waitForTimeout(ALPINE_INIT);

  console.log('=== INITIAL STATE ===');
  console.log('URL:', mainWindow.url());

  // Check if Alpine is initialized and splitPane is registered
  const alpineStatus = await mainWindow.evaluate(() => {
    const appEl = document.getElementById('app');
    let alpineDataResult = null;
    try {
      alpineDataResult = Alpine.$data(appEl);
    } catch (e) {
      alpineDataResult = { error: e.message };
    }

    return {
      alpineExists: typeof Alpine !== 'undefined',
      hasAlpineData: typeof Alpine.$data === 'function',
      appEl: !!appEl,
      hasXData: appEl?.hasAttribute('x-data'),
      xDataValue: appEl?.getAttribute('x-data'),
      $dataKeys: Object.keys(alpineDataResult || {}),
      hasLeftTabs: !!alpineDataResult?.leftTabs
    };
  });
  console.log('Alpine status:', JSON.stringify(alpineStatus, null, 2));

  // Inject all fixtures
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

  // Add native event listener to check if event bubbles
  await mainWindow.evaluate(() => {
    const markdownDiv = document.querySelector('.markdown-content');
    console.log('Adding native click listener to:', markdownDiv);
    markdownDiv.addEventListener('click', (e) => {
      console.log('NATIVE CLICK EVENT:', e.target.tagName, e.target.getAttribute('href'));
    });
  });

  await mainWindow.waitForTimeout(ALPINE_INIT);

  // Verify markdown rendered
  const hasMarkdown = await mainWindow.locator('.markdown-content').isVisible();
  console.log('Markdown visible:', hasMarkdown);
  expect(hasMarkdown).toBe(true);

  // Check if the HTML has the new structure (no x-data on parent div)
  const htmlCheck = await mainWindow.evaluate(() => {
    const markdownDiv = document.querySelector('.markdown-content');
    const parentDiv = markdownDiv?.parentElement?.parentElement;
    return {
      parentHasXData: parentDiv?.hasAttribute('x-data'),
      parentXDataValue: parentDiv?.getAttribute('x-data'),
      markdownOuterHTML: markdownDiv?.outerHTML?.substring(0, 200)
    };
  });
  console.log('HTML structure check:', JSON.stringify(htmlCheck, null, 2));

  // Find the link
  const link = await mainWindow.locator('.markdown-content a[href="page-a.md"]');
  const linkCount = await link.count();
  console.log('Link count:', linkCount);
  expect(linkCount).toBe(1);

  console.log('\n=== CLICKING LINK ===');

  // Click the link
  await link.click();
  await mainWindow.waitForTimeout(500);

  // Check what happened
  const urlAfter = mainWindow.url();
  console.log('URL after click:', urlAfter);

  if (urlAfter.includes('index.html')) {
    const tabState = await mainWindow.evaluate(() => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      return {
        tabCount: alpineData.leftTabs?.length,
        tabs: alpineData.leftTabs?.map(t => ({ id: t.id, label: t.label })),
        activeTab: alpineData.activeLeftTab
      };
    });
    console.log('Tab state after click:', JSON.stringify(tabState, null, 2));
  } else {
    console.log('Page navigated away - Alpine not available');
  }

  await electronApp.close();
});
