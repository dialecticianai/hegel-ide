const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 10000,
  use: {
    // Point to our installed electron binary
    electronPath: require('electron'),
    launchOptions: {
      env: {
        ...process.env,
        TESTING: 'true'
      }
    }
  }
});
