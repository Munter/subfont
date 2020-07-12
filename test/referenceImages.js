const expect = require('./expect');

describe('reference images', function () {
  for (const inlineCss of [true, false]) {
    describe(`with inlineCss:${inlineCss}`, function () {
      for (const inlineFonts of [true, false]) {
        describe(`with inlineFonts:${inlineFonts}`, function () {
          for (const omitFallbacks of [true, false]) {
            describe(`with omitFallbacks:${omitFallbacks}`, function () {
              it('should render a simple test case without ligatures', async function () {
                await expect(
                  'withoutLigatures',
                  'to render the same after subsetting',
                  {
                    inlineCss,
                    inlineFonts,
                    omitFallbacks,
                  }
                );
              });

              it('should render ligatures correctly', async function () {
                await expect(
                  'ligatures',
                  'to render the same after subsetting',
                  {
                    inlineCss,
                    inlineFonts,
                    omitFallbacks,
                  }
                );
              });

              for (const dynamic of [true, false]) {
                describe(`with dynamic:${dynamic}`, function () {
                  it('should render missing glyphs', async function () {
                    await expect(
                      'missingGlyphs',
                      'to render the same after subsetting',
                      {
                        inlineCss,
                        inlineFonts,
                        omitFallbacks,
                        dynamic,
                      }
                    );
                  });

                  it('should render unused variants', async function () {
                    await expect(
                      'unusedVariants',
                      'to render the same after subsetting',
                      {
                        inlineCss,
                        inlineFonts,
                        omitFallbacks,
                        dynamic,
                      }
                    );
                  });
                });
              }
            });
          }
        });
      }
    });
  }
});
