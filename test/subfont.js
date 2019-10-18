/* global describe, it */
const sinon = require('sinon');
const expect = require('unexpected').clone();
const subfont = require('../lib/subfont');
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
          silent: true,
          dryRun: true
        },
        mockConsole
      );

      const cssAsset = assetGraph.findAssets({
        type: 'Css'
      })[0];
      expect(
        cssAsset.url,
        'to equal',
        `${assetGraph.root}subfont/styles-38ce4ca68c.css`
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
          silent: true,
          dryRun: true
        },
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

      const root = 'https://example.com/';
      const assetGraph = await subfont(
        {
          root,
          inputFiles: [root],
          fallbacks: false,
          silent: true,
          dryRun: true
        },
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
    const root = encodeURI(
      `file://${pathModule.resolve(__dirname, '..', 'testdata', 'iframe')}`
    );

    const assetGraph = await subfont(
      {
        root,
        inputFiles: [`${root}/index.html`],
        silent: true,
        dryRun: true
      },
      mockConsole
    );

    expect(
      assetGraph.findRelations({ type: 'HtmlIFrame' })[0].to.isLoaded,
      'to be false'
    );
  });
});
