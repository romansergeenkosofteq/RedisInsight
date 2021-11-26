const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
const electronPath = require('electron');

const app = new Application({
  path: 'C:/Users/Tatsiana Troyanova/AppData/Local/Programs/redisinsight/RedisInsight-preview.exe',
  //args: [path.join(__dirname, '..')]
});

describe('Desktop app tests', function () {
  this.timeout(10000);

  beforeEach(() => {
    return app.start();
  });

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  it('should work', () => {
    // Delete this test as soon as you write one of your own.
    assert.ok(true);
  });
});
