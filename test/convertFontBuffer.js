const convertFontBuffer = require('../lib/convertFontBuffer');
const detectFontFormat = require('../lib/detectFontFormat');
const fs = require('fs').promises;
const pathModule = require('path');
const expect = require('unexpected').clone();

describe('convertFontBuffer', function () {
  before(async function () {
    this.truetype = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.ttf'
      )
    );
    this.woff = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.woff'
      )
    );
    this.woff2 = await fs.readFile(
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'subsetFonts',
        'Roboto-400.woff2'
      )
    );
  });

  describe('when the source format is not given', function () {
    it('should throw if the source format could not be detected', async function () {
      expect(
        () => convertFontBuffer(Buffer.from('abcd'), 'truetype'),
        'to error',
        'Unrecognized font signature: abcd'
      );
    });

    it('should convert a truetype font to truetype', async function () {
      const buffer = await convertFontBuffer(this.truetype, 'truetype');
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
      expect(buffer, 'to be', this.truetype); // Should be a noop
    });

    it('should convert a truetype font to woff', async function () {
      const buffer = await convertFontBuffer(this.truetype, 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
    });

    it('should convert a truetype font to woff2', async function () {
      const buffer = await convertFontBuffer(this.truetype, 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
    });

    it('should convert a woff font to truetype', async function () {
      const buffer = await convertFontBuffer(this.woff, 'truetype');
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
    });

    it('should convert a woff font to woff', async function () {
      const buffer = await convertFontBuffer(this.woff, 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
      expect(buffer, 'to be', this.woff); // Should be a noop
    });

    it('should convert a woff font to woff2', async function () {
      const buffer = await convertFontBuffer(this.woff, 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
    });

    it('should convert a woff2 font to truetype', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'truetype');
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
    });

    it('should convert a woff2 font to woff', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
    });

    it('should convert a woff2 font to woff2', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
      expect(buffer, 'to be', this.woff2); // Should be a noop
    });
  });

  describe('when the source format is given', function () {
    it('should convert a truetype font to truetype', async function () {
      const buffer = await convertFontBuffer(
        this.truetype,
        'truetype',
        'truetype'
      );
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
      expect(buffer, 'to be', this.truetype); // Should be a noop
    });

    it('should convert a truetype font to woff', async function () {
      const buffer = await convertFontBuffer(this.truetype, 'woff', 'truetype');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
    });

    it('should convert a truetype font to woff2', async function () {
      const buffer = await convertFontBuffer(
        this.truetype,
        'woff2',
        'truetype'
      );
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
    });

    it('should convert a woff font to truetype', async function () {
      const buffer = await convertFontBuffer(this.woff, 'truetype', 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
    });

    it('should convert a woff font to woff', async function () {
      const buffer = await convertFontBuffer(this.woff, 'woff', 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
      expect(buffer, 'to be', this.woff); // Should be a noop
    });

    it('should convert a woff font to woff2', async function () {
      const buffer = await convertFontBuffer(this.woff, 'woff2', 'woff');
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
    });

    it('should convert a woff2 font to truetype', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'truetype', 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'truetype');
    });

    it('should convert a woff2 font to woff', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'woff', 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'woff');
    });

    it('should convert a woff2 font to woff2', async function () {
      const buffer = await convertFontBuffer(this.woff2, 'woff2', 'woff2');
      expect(detectFontFormat(buffer), 'to equal', 'woff2');
      expect(buffer, 'to be', this.woff2); // Should be a noop
    });
  });
});
