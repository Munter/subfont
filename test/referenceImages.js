const expect = require('./expect');
const combos = require('combos');

describe('reference images', function () {
  for (const options of combos({
    inlineCss: [false, true],
    inlineFonts: [false, true],
    omitFallbacks: [false, true],
    dynamic: [false, true],
    harfbuzz: [false, true],
    hrefType: ['rootRelative', 'relative'],
  })) {
    describe(`with ${Object.keys(options)
      .map((key) => `${key}: ${options[key]}`)
      .join(', ')}`, function () {
      it('should render a simple test case without ligatures', async function () {
        await expect(
          'withoutLigatures',
          'to render the same after subsetting',
          options
        );
      });

      it('should render ligatures correctly', async function () {
        await expect(
          'ligatures',
          'to render the same after subsetting',
          options
        );
      });

      it('should render missing glyphs', async function () {
        await expect(
          'missingGlyphs',
          'to render the same after subsetting',
          options
        );
      });

      it('should render unused variants', async function () {
        await expect(
          'unusedVariants',
          'to render the same after subsetting',
          options
        );
      });
    });
  }
});
