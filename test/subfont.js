/* global describe, it */
const sinon = require('sinon');
const expect = require('unexpected').clone().use(require('unexpected-sinon'));
const subfont = require('../lib/subfont');
const httpception = require('httpception');
const AssetGraph = require('assetgraph');
const proxyquire = require('proxyquire');
const pathModule = require('path');

const openSansBold = require('fs').readFileSync(
  pathModule.resolve(
    __dirname,
    '..',
    'testdata',
    'k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff'
  )
);

describe('subfont', function () {
  let mockConsole;
  beforeEach(async function () {
    mockConsole = {
      info: sinon.spy(),
      log: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('when a font is referenced by a stylesheet hosted outside the root', function () {
    it('should move the CSS into the root', async function () {
      httpception([
        {
          request: 'GET https://mycdn.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `
              @font-face {
                font-family: 'Open Sans';
                font-style: normal;
                font-weight: 700;
                src: url(http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff) format('woff');
              }

              div {
                font-family: Open Sans;
              }
            `,
          },
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff',
            },
            body: openSansBold,
          },
        },
      ]);

      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'stylesheetAtOtherOrigin',
          'referencesFont'
        )}`
      );

      const assetGraph = await subfont(
        {
          root,
          inputFiles: [`${root}/index.html`],
          dryRun: true,
        },
        mockConsole
      );

      const cssAsset = assetGraph.findAssets({
        type: 'Css',
      })[0];
      expect(
        cssAsset.url,
        'to equal',
        `${assetGraph.root}subfont/styles-38ce4ca68c.css`
      );
    });
  });

  describe('when there is an external stylesheet that does not reference a font', function () {
    it('should not move the CSS into the root', async function () {
      httpception([
        {
          request: 'GET https://mycdn.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `
              @font-face {
                font-family: 'Open Sans';
                font-style: normal;
                font-weight: 700;
                src: url(http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff) format('woff');
              }
            `,
          },
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff',
            },
            body: openSansBold,
          },
        },
      ]);

      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'stylesheetAtOtherOrigin',
          'referencesFont'
        )}`
      );

      const assetGraph = await subfont(
        {
          root,
          inputFiles: [`${root}/index.html`],
          dryRun: true,
        },
        mockConsole
      );

      const cssAsset = assetGraph.findAssets({ fileName: 'styles.css' })[0];
      expect(cssAsset.url, 'to equal', 'https://mycdn.com/styles.css');
    });
  });

  describe('with --no-fallbacks', function () {
    it('should leave out the fallbacks', async function () {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            headers: {
              'Content-Type': 'text/html',
            },
            body: `
              <!DOCTYPE html>
              <html>

              <head>
                <style>
                  @font-face {
                    font-family: Open Sans;
                    font-style: normal;
                    font-weight: 700;
                    src: url(http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff) format('woff');
                  }

                  div {
                    font-family: Open Sans;
                  }
                </style>
              </head>
              <body>
                <div>Hello</div>
              </body>
              </html>
            `,
          },
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff',
            },
            body: openSansBold,
          },
        },
      ]);

      const root = 'https://example.com/';
      const assetGraph = await subfont(
        {
          root,
          inputFiles: [root],
          fallbacks: false,
          dryRun: true,
        },
        mockConsole
      );

      const inlineCssAsset = assetGraph.findAssets({
        type: 'Css',
        isInline: true,
      })[0];
      expect(
        inlineCssAsset.text,
        'to contain',
        "font-family: 'Open Sans__subset';"
      );
    });
  });

  describe('when fetching an entry point results in an HTTP redirect', function () {
    describe('with a single entry point', function () {
      beforeEach(function () {
        httpception([
          {
            request: 'GET http://example.com/',
            response: {
              statusCode: 301,
              headers: {
                Location: 'https://somewhereelse.com/',
              },
            },
          },
          {
            request: 'GET https://somewhereelse.com/',
            response: {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
              },
              body: `<!DOCTYPE html>
              <html>

              <head>
                <style>
                  @font-face {
                    font-family: Open Sans;
                    src: url(OpenSans.woff) format('woff');
                  }

                  div {
                    font-family: Open Sans;
                  }
                </style>
              </head>
              <body>
                <div>Hello</div>
              </body>
              </html>
            `,
            },
          },
          {
            request: 'GET http://somewhereelse.com/OpenSans.woff',
            response: {
              headers: {
                'Content-Type': 'font/woff',
              },
              body: openSansBold,
            },
          },
        ]);
      });

      it('should issue a warning', async function () {
        const root = 'http://example.com/';
        sinon.stub(AssetGraph.prototype, 'info');

        const assetGraph = await subfont(
          {
            root,
            inputFiles: [root],
            fallbacks: false,
            dryRun: true,
          },
          mockConsole
        );

        const htmlAssets = assetGraph.findAssets({
          isInitial: true,
          type: 'Html',
        });
        expect(htmlAssets, 'to have length', 1);
        expect(
          htmlAssets[0].url,
          'to equal',
          'https://somewhereelse.com/index.html'
        );
        expect(assetGraph.info, 'to have a call satisfying', () => {
          assetGraph.info(
            new Error(
              'http://example.com/ redirected to https://somewhereelse.com/'
            )
          );
        });
      });

      it('should change the root of the graph so that files get written to disc', async function () {
        const root = 'http://example.com/';

        sinon.stub(AssetGraph.prototype, 'info');
        const assetGraph = await subfont(
          {
            root,
            inputFiles: [root],
            fallbacks: false,
            dryRun: true,
          },
          mockConsole
        );

        expect(assetGraph.root, 'to equal', 'https://somewhereelse.com/');

        expect(assetGraph.info, 'to have a call satisfying', () => {
          assetGraph.info(
            new Error(
              'All entrypoints redirected, changing root from http://example.com/ to https://somewhereelse.com/'
            )
          );
        });
      });
    });

    describe('but other entry points do not get redirected', function () {
      beforeEach(function () {
        httpception([
          {
            request: 'GET http://example.com/',
            response: {
              statusCode: 301,
              headers: {
                Location: 'https://somewhereelse.com/',
              },
            },
          },
          {
            request: 'GET http://example.com/page2',
            response: {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
              },
              body: `<!DOCTYPE html><html></html>`,
            },
          },
          {
            request: 'GET https://somewhereelse.com/',
            response: {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
              },
              body: `<!DOCTYPE html>
              <html>
                <head>
                  <style>
                    @font-face {
                      font-family: Open Sans;
                      src: url(OpenSans.woff) format('woff');
                    }

                    div {
                      font-family: Open Sans;
                    }
                  </style>
                </head>
                <body>
                  <div>Hello</div>
                </body>
              </html>
            `,
            },
          },
          {
            request: 'GET http://somewhereelse.com/OpenSans.woff',
            response: {
              headers: {
                'Content-Type': 'font/woff',
              },
              body: openSansBold,
            },
          },
        ]);
      });

      it('should not change the root', async function () {
        const root = 'http://example.com/';

        const assetGraph = await subfont(
          {
            root,
            inputFiles: [root, `${root}page2`],
            fallbacks: false,
            dryRun: true,
          },
          mockConsole
        );

        expect(assetGraph.root, 'to equal', 'http://example.com/');
      });
    });
  });

  it('should not dive into iframes', async function () {
    const root = encodeURI(
      `file://${pathModule.resolve(__dirname, '..', 'testdata', 'iframe')}`
    );

    const assetGraph = await subfont(
      {
        root,
        inputFiles: [`${root}/index.html`],
        silent: true,
        dryRun: true,
      },
      mockConsole
    );

    expect(
      assetGraph.findRelations({ type: 'HtmlIFrame' })[0].to.isLoaded,
      'to be false'
    );
  });

  it('should report how many codepoints are used on the page as well as globally', async function () {
    const root = encodeURI(
      `file://${pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'differentCodepointsOnDifferentPages'
      )}`
    );

    await subfont(
      {
        dryRun: true,
        root,
        inputFiles: [`${root}/first.html`, `${root}/second.html`],
      },
      mockConsole
    );
    expect(mockConsole.log, 'to have a call satisfying', () => {
      mockConsole.log(
        expect.it('to contain', '400 : 6/213 codepoints used (3 on this page),')
      );
    }).and('to have a call satisfying', () => {
      mockConsole.log(
        expect.it('to contain', '400 : 6/213 codepoints used (4 on this page),')
      );
    });
  });

  // Regression test for https://gitter.im/assetgraph/assetgraph?at=5f1ddc1afe6ecd2888764496
  it('should not crash in the reporting code when a font has no text on a given page', async function () {
    const root = encodeURI(
      `file://${pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'noFontUsageOnOnePage'
      )}`
    );

    await subfont(
      {
        dryRun: true,
        root,
        inputFiles: [`${root}/first.html`, `${root}/second.html`],
      },
      mockConsole
    );
    expect(mockConsole.log, 'to have a call satisfying', () => {
      mockConsole.log(expect.it('to contain', '400 : 3/213 codepoints used,'));
    });
  });

  describe('with --dynamic', function () {
    it('should find glyphs added to the page via JavaScript', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'dynamicallyInjectedText'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/213 codepoints used')
        );
      });
    });

    it('should find glyphs in the original HTML that get removed by JavaScript', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'dynamicallyRemovedText'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 16/213 codepoints used,')
        );
      });
    });

    it('should work with an absolute url that matches canonicalUrl (without a path component)', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'canonicalUrlWithoutPathComponent'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          canonicalRoot: 'https://gofish.dk/',
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/213 codepoints used')
        );
      });
    });

    it('should work with an absolute url that matches canonicalUrl (with a path component)', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'canonicalUrlWithPathComponent'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          canonicalRoot: 'https://gofish.dk/the/magic/path/',
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/213 codepoints used')
        );
      });
    });

    it('should echo errors occuring in the headless browser to the console', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'pageWithErrors'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.error, 'to have a call satisfying', [
        'GET https://domainthatdoesnotexist12873621321312.com/blablabla.js failed: net::ERR_NAME_NOT_RESOLVED',
      ])
        .and('to have a call satisfying', [
          'ReferenceError: iAmNotAFunction is not defined\n    at https://example.com/index.html:20:7',
        ])
        .and('to have a call satisfying', [
          'GET https://assetgraph.org/nonexistent12345.js returned 404',
        ]);
    });

    it('should not fail to inject the font-tracer script on a page that has a strict CSP', async function () {
      const root = encodeURI(
        `file://${pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'pageWithStrictCsp'
        )}`
      );

      await subfont(
        {
          dryRun: true,
          dynamic: true,
          debug: true,
          root,
          inputFiles: [`${root}/index.html`],
        },
        mockConsole
      );
      expect(mockConsole.error, 'was not called');
    });
  });

  describe('configuring via browserslist', function () {
    // https://github.com/browserslist/browserslist#best-practices
    it('should default to woff2 when no config is given, due to the browserslist defaults', async function () {
      const dir = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'pageWithStrictCsp'
      );
      const root = encodeURI(`file://${dir}`);
      const mockSubsetFonts = sinon.stub().resolves({ fontInfo: [] });

      const originalDir = process.cwd();
      process.chdir(dir);

      try {
        await proxyquire('../lib/subfont', {
          '../lib/subsetFonts': mockSubsetFonts,
        })(
          {
            root,
            inputFiles: [`${root}/index.html`],
            dryRun: true,
          },
          mockConsole
        );
        expect(mockSubsetFonts, 'to have calls satisfying', () => {
          mockSubsetFonts(expect.it('to be an object'), {
            formats: ['woff2'],
          });
        });
      } finally {
        process.chdir(originalDir);
      }
    });

    it('should prefer the browsers config option over browserslist configured in package.json', async function () {
      const dir = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'browserslistInPackageJson'
      );
      const root = encodeURI(`file://${dir}`);
      const mockSubsetFonts = sinon.stub().resolves({ fontInfo: [] });

      const originalDir = process.cwd();
      process.chdir(dir);

      try {
        await proxyquire('../lib/subfont', {
          '../lib/subsetFonts': mockSubsetFonts,
        })(
          {
            root,
            inputFiles: [`${root}/index.html`],
            dryRun: true,
            browsers: 'IE 11, Chrome 80',
          },
          mockConsole
        );
        expect(mockSubsetFonts, 'to have calls satisfying', () => {
          mockSubsetFonts(expect.it('to be an object'), {
            formats: ['woff2', 'woff'],
          });
        });
      } finally {
        process.chdir(originalDir);
      }
    });

    it('should pick up the browserslist configuration from package.json', async function () {
      const dir = pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'browserslistInPackageJson'
      );
      const root = encodeURI(`file://${dir}`);
      const mockSubsetFonts = sinon.stub().resolves({ fontInfo: [] });

      const originalDir = process.cwd();
      process.chdir(dir);

      try {
        await proxyquire('../lib/subfont', {
          '../lib/subsetFonts': mockSubsetFonts,
        })(
          {
            root,
            inputFiles: [`${root}/index.html`],
            dryRun: true,
          },
          mockConsole
        );
        expect(mockSubsetFonts, 'to have calls satisfying', () => {
          mockSubsetFonts(expect.it('to be an object'), {
            formats: ['woff2', 'truetype'],
          });
        });
      } finally {
        process.chdir(originalDir);
      }
    });
  });
});
