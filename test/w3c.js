const expect = require('./expect');
const combos = require('combos');
const fs = require('fs');
const pathModule = require('path');

describe('w3c-tests WOFF2', function () {
  for (const options of combos({
    harfbuzz: [false, true],
  })) {
    describe(`with ${Object.keys(options)
      .map((key) => `${key}: ${options[key]}`)
      .join(', ')}`, function () {
      const baseDir = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'w3c-test.org',
        'css',
        'WOFF2'
      );
      const fileNames = fs
        .readdirSync(baseDir)
        .filter((fileName) => fileName.endsWith('.xht'));
      for (const fileName of fileNames) {
        it(`should render ${fileName}`, async function () {
          // The font linked from this test case crashes wawoff2, https://github.com/fontello/wawoff2/issues/7
          if (fileName === 'header-totalsfntsize-001.xht') {
            this.skip();
          }

          await expect(
            pathModule.resolve(baseDir, fileName),
            'to render the same after subsetting',
            options
          );
        });
      }
    });
  }
});
