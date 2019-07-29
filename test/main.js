/*global describe, it*/
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const main = require('../lib/main');
const httpception = require('httpception');
const pathModule = require('path');
const openSansBold = require('fs').readFileSync(
  pathModule.resolve(
    __dirname,
    '..',
    'testdata',
    'k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff'
  )
);

describe('subfont', function() {
  let mockConsole;
  beforeEach(async function() {
    mockConsole = { log: sinon.spy(), error: console.error };
  });

  describe('when a font is referenced by a stylesheet hosted outside the root', function() {
    it('should move the CSS into the root', async function() {
      httpception([
        {
          request: 'GET https://mycdn.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css'
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
            `
          }
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: openSansBold
          }
        }
      ]);

      const rootUrl = encodeURI(
        'file://' +
          pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'stylesheetAtOtherOrigin',
            'referencesFont'
          )
      );

      const assetGraph = await main(
        ['--silent', '--dryrun', '--root', rootUrl, `${rootUrl}/index.html`],
        mockConsole
      );

      const cssAsset = assetGraph.findAssets({
        type: 'Css'
      })[0];
      expect(
        cssAsset.url,
        'to equal',
        assetGraph.root + 'subfont/styles-38ce4ca68c.css'
      );
    });
  });

  describe('when there is an external stylesheet that does not reference a font', function() {
    it('should not move the CSS into the root', async function() {
      httpception([
        {
          request: 'GET https://mycdn.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: `
              @font-face {
                font-family: 'Open Sans';
                font-style: normal;
                font-weight: 700;
                src: url(http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff) format('woff');
              }
            `
          }
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: openSansBold
          }
        }
      ]);

      const rootUrl = encodeURI(
        'file://' +
          pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'stylesheetAtOtherOrigin',
            'referencesFont'
          )
      );

      const assetGraph = await main(
        ['--silent', '--dryrun', '--root', rootUrl, `${rootUrl}/index.html`],
        mockConsole
      );

      const cssAsset = assetGraph.findAssets({ fileName: 'styles.css' })[0];
      expect(cssAsset.url, 'to equal', 'https://mycdn.com/styles.css');
    });
  });

  describe('with --no-fallbacks', function() {
    it('should leave out the fallbacks', async function() {
      httpception([
        {
          request: 'GET https://example.com/',
          response: {
            headers: {
              'Content-Type': 'text/html'
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
            `
          }
        },
        {
          request:
            'GET http://themes.googleusercontent.com/static/fonts/opensans/v8/k3k702ZOKiLJc3WVjuplzHhCUOGz7vYGh680lGh-uXM.woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: openSansBold
          }
        }
      ]);

      const rootUrl = 'https://example.com/';
      const assetGraph = await main(
        ['--silent', '--dryrun', '--no-fallbacks', rootUrl],
        mockConsole
      );

      const inlineCssAsset = assetGraph.findAssets({
        type: 'Css',
        isInline: true
      })[0];
      expect(
        inlineCssAsset.text,
        'to contain',
        "font-family: 'Open Sans__subset';"
      );
    });
  });

  it('should not dive into iframes', async function() {
    const rootUrl = encodeURI(
      'file://' + pathModule.resolve(__dirname, '..', 'testdata', 'iframe')
    );

    const assetGraph = await main(
      ['--silent', '--dryrun', '--root', rootUrl, `${rootUrl}/index.html`],
      mockConsole
    );

    expect(
      assetGraph.findRelations({ type: 'HtmlIFrame' })[0].to.isLoaded,
      'to be false'
    );
  });

  describe('with --dynamic', function() {
    it('should find glyphs added to the page via JavaScript', async function() {
      const rootUrl = encodeURI(
        'file://' +
          pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'dynamicallyInjectedText'
          )
      );

      await main(
        [
          '--silent',
          '--dryrun',
          '--dynamic',
          '--debug',
          '--root',
          rootUrl,
          `${rootUrl}/index.html`
        ],
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/214 codepoints used')
        );
      });
    });

    it('should work with an absolute url that matches canonicalUrl (without a path component)', async function() {
      const rootUrl = encodeURI(
        'file://' +
          pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'canonicalUrlWithoutPathComponent'
          )
      );

      await main(
        [
          '--silent',
          '--dryrun',
          '--dynamic',
          '--debug',
          '--canonicalroot',
          'https://gofish.dk/',
          '--root',
          rootUrl,
          `${rootUrl}/index.html`
        ],
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/214 codepoints used')
        );
      });
    });

    it('should work with an absolute url that matches canonicalUrl (with a path component)', async function() {
      const rootUrl = encodeURI(
        'file://' +
          pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'canonicalUrlWithPathComponent'
          )
      );

      await main(
        [
          '--silent',
          '--dryrun',
          '--dynamic',
          '--debug',
          '--canonicalroot',
          'https://gofish.dk/the/magic/path/',
          '--root',
          rootUrl,
          `${rootUrl}/index.html`
        ],
        mockConsole
      );
      expect(mockConsole.log, 'to have a call satisfying', () => {
        mockConsole.log(
          expect.it('to contain', '400 : 14/214 codepoints used')
        );
      });
    });
  });
});
