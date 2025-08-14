const { Application } = require('spectron');
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

          // eslint-disable-next-line jest/no-conditional-expect
          expect(numDiffPixels).toBe(0);
        } else {
          // Baseline does not exist, create it
          fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
          fs.writeFileSync(baselinePath, imageBuffer);
          console.warn(`Baseline created at: ${baselinePath}`);
          // eslint-disable-next-line jest/no-conditional-expect
          expect(fs.existsSync(baselinePath)).toBe(true);
        }
      });
    });
  });
});
