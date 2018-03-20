/*global describe, it*/
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

      const [assetGraph] = await subfont({
        rootUrl,
        inputUrls: [`${rootUrl}/index.html`]
      });
      const cssAsset = assetGraph.findAssets({ fileName: 'styles.css' })[0];
      expect(cssAsset.url, 'to equal', assetGraph.root + 'styles.css');
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

      const [assetGraph] = await subfont({
        rootUrl,
        inputUrls: [`${rootUrl}/index.html`]
      });
      const cssAsset = assetGraph.findAssets({ fileName: 'styles.css' })[0];
      expect(cssAsset.url, 'to equal', 'https://mycdn.com/styles.css');
    });
  });
});
