const { Application } = require('spectron');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

describe('Visual Regression Tests', function () {
  this.timeout(10000);

  let app;

  before(function () {
    app = new Application({
      path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      args: [path.join(__dirname, '..')],
    });
    return app.start();
  });

  after(function () {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  it('should match the baseline snapshot of the main window', function () {
    const screenshotPath = path.join(__dirname, 'screenshots', 'main-window.png');
    const baselinePath = path.join(__dirname, 'baselines', 'main-window.png');

    return app.client.getWindowHandle().then(() => {
      return app.browserWindow.capturePage().then(function (imageBuffer) {
        if (fs.existsSync(baselinePath)) {
          // Baseline exists, compare with the new screenshot
          const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
          const screenshot = PNG.sync.read(imageBuffer);
          const { width, height } = baseline;
          const diff = new PNG({ width, height });

          const numDiffPixels = pixelmatch(
            baseline.data,
            screenshot.data,
            diff.data,
            width,
            height,
            { threshold: 0.1 }
          );

          assert.strictEqual(numDiffPixels, 0, 'The screenshot does not match the baseline.');
        } else {
          // Baseline does not exist, create it
          fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
          fs.writeFileSync(baselinePath, imageBuffer);
          console.log(`Baseline created at: ${baselinePath}`);
        }
      });
    });
  });
});
