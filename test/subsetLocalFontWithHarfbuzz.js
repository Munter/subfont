const expect = require('unexpected');
const subsetLocalFontWithHarfbuzz = require('../lib/subsetLocalFontWithHarfbuzz');
const readFileAsync = require('util').promisify(require('fs').readFile);
const pathModule = require('path');

describe('subsetLocalFontWithHarfbuzz', function () {
  describe('with a truetype font', function () {
    it('should produce a subset as ttf', async function () {
      const openSansTtf = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'local-single',
          'OpenSans.ttf'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansTtf,
        'ttf',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansTtf.length);
      // TODO: Check for truetype signature/magic?
    });

    it('should produce a subset as woff', async function () {
      const openSansTtf = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'local-single',
          'OpenSans.ttf'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansTtf,
        'woff',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansTtf.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOFF');
    });

    it('should produce a subset as woff2', async function () {
      const openSansTtf = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'local-single',
          'OpenSans.ttf'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansTtf,
        'woff2',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansTtf.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOF2');
    });
  });

  describe('with a woff font', function () {
    it('should produce a subset as ttf', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'ttf',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      // TODO: Check for truetype signature/magic?
    });

    it('should produce a subset as woff', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'woff',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOFF');
    });

    it('should produce a subset as woff2', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'woff2',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOF2');
    });
  });

  describe('with a woff2 font', function () {
    it('should produce a subset as ttf', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'Roboto-400.woff2'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'ttf',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      // TODO: Check for truetype signature/magic?
    });

    it('should produce a subset as woff', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'Roboto-400.woff2'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'woff',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOFF');
    });

    it('should produce a subset as woff2', async function () {
      const openSansWoff = await readFileAsync(
        pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'subsetFonts',
          'Roboto-400.woff2'
        )
      );
      const result = await subsetLocalFontWithHarfbuzz(
        openSansWoff,
        'woff2',
        'abcd'
      );

      expect(result, 'to be a', 'Buffer');
      expect(result.length, 'to be less than', openSansWoff.length);
      expect(result.slice(0, 4).toString(), 'to equal', 'wOF2');
    });
  });
});
