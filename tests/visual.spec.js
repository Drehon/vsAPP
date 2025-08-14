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

  // Example of a test that navigates and then takes a screenshot
  test('should navigate to a lesson and take a screenshot', async () => {
    // This is a placeholder for the actual navigation logic.
    // You will need to replace this with the correct locators and actions
    // to navigate to the desired page.
    // For example:
    // await window.click('text=Lessons');
    // await window.click('text=Lesson 1');
    await takeScreenshot(window, 'lesson-page');
  });
});
