const { test, _electron } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

test.beforeAll(async () => {
  // You might need to adjust the path to your app's executable
  const electronApp = await _electron.launch({
    executablePath: './out/vsAPP-linux-x64/vsAPP',
    args: ['--no-sandbox'],
    headless: true,
  });
  // Add a global reference to the app for use in tests
  global.electronApp = electronApp;
});

test.afterAll(async () => {
  await global.electronApp.close();
});

async function takeScreenshot(window, name) {
  await window.screenshot({ path: path.join(screenshotsDir, `${name}.png`) });
}

test.describe('Visual Tests', () => {
  let window;

  test.beforeEach(async () => {
    // Get the first window that the app opens
    window = await global.electronApp.firstWindow();
  });

  test('should take a screenshot of the main window', async () => {
    await takeScreenshot(window, 'main-window');
  });

  test('should navigate to a lesson page and take a screenshot', async () => {
    await window.evaluate((filePath) => window.api.navigate(filePath), 'pages/lessons/L1 - congiuntivo.html');
    // Wait for the content to load
    await window.waitForTimeout(1000);
    await takeScreenshot(window, 'lesson-page');
  });

  test('should navigate to a lessonAN page and take a screenshot', async () => {
    await window.evaluate((filePath) => window.api.navigate(filePath), 'pages/lessonsAN/L1 - congiuntivo AN.html');
    // Wait for the content to load
    await window.waitForTimeout(1000);
    await takeScreenshot(window, 'lessonAN-page');
  });

  test('should navigate to an exercise page and take a screenshot', async () => {
    await window.evaluate((filePath) => window.api.navigate(filePath), 'pages/exercises/L1 - congiuntivo ES.html');
    // Wait for the content to load
    await window.waitForTimeout(1000);
    await takeScreenshot(window, 'exercise-page');
  });

  test('should navigate to the patch notes page and take a screenshot', async () => {
    await window.evaluate((filePath) => window.api.navigate(filePath), 'pages/others/patch-notes.html');
    // Wait for the content to load
    await window.waitForTimeout(1000);
    await takeScreenshot(window, 'patch-notes-page');
  });
});
