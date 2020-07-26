const convertFontBuffer = require('../lib/convertFontBuffer');
const detectFontFormat = require('../lib/detectFontFormat');
const fs = require('fs').promises;
const pathModule = require('path');
const expect = require('unexpected').clone();

describe('detectFontFormat', function () {
  it('should throw if the contents of the buffer could not be recognized', async function () {
    expect(
      () => convertFontBuffer(Buffer.from('abcd'), 'truetype'),
      'to error',
      'Unrecognized font signature: abcd'
    );
  });

  it('should detect a truetype font', async function () {
    const buffer = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.ttf'
      )
    );
    expect(detectFontFormat(buffer), 'to equal', 'truetype');
  });

  it('should detect a woff font', async function () {
    const buffer = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.woff'
      )
    );
    expect(detectFontFormat(buffer), 'to equal', 'woff');
  });

  it('should detect a woff2 font', async function () {
    const buffer = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.woff2'
      )
    );
    expect(detectFontFormat(buffer), 'to equal', 'woff2');
  });
});
