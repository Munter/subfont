const fs = require('fs');
const { html } = require('html-generators');
const { stylesheet } = require('css-generators');
const AssetGraph = require('assetgraph');
const pathModule = require('path');
const stringify = require('html-generators/src/stringify');
const expect = require('./expect');

describe('generated html', function () {
  let smileySvgBase64;

  before(async function () {
    smileySvgBase64 = `data:image/svg+xml;base64,${fs
      .readFileSync(
        pathModule.resolve(__dirname, '..', 'testdata', 'smiley.svg')
      )
      .toString('base64')}`;
  });

  function fixBogusUrls(text) {
    return text.replace(/url\([^)]*\)/g, `url(${smileySvgBase64})`);
  }

  function fixupUnsupportedHtmlConstructs(obj) {
    if (obj.text) {
      obj.text = fixBogusUrls(obj.text);
    }
    if (obj.type === 'tag') {
      if (obj.tag === 'object') {
        delete obj.attributes.data;
      }
      if ('src' in obj.attributes) {
        delete obj.attributes.src;
      }
      for (const child of obj.children) {
        fixupUnsupportedHtmlConstructs(child);
      }
    }
    if (obj.attributes && obj.attributes.style) {
      obj.attributes.style = fixBogusUrls(obj.attributes.style);
    }
  }

  it('should render the same before and after subsetting', async function () {
    return expect(
      async (htmlObjectTree, stylesheet) => {
        fixupUnsupportedHtmlConstructs(htmlObjectTree);

        stylesheet = fixBogusUrls(stylesheet)
          .replace(/all: (?:initial|unset);/g, '') // Makes the contents of stylesheets visible
          .replace(/font-variant-caps: [^;]+;/, '') // See build #260.3 failure
          .replace(/oblique [0-9.]+\w+/, 'oblique'); // oblique with an angle is not yet fully standardized or implemented in font-snapper
        const head = htmlObjectTree.children[0];
        head.children.push({
          type: 'tag',
          tag: 'style',
          attributes: [],
          children: [
            {
              type: 'text',
              value: `
                @font-face {
                  font-family: 'IBM Plex Sans';
                  font-style: normal;
                  font-weight: 400;
                  src: url('IBMPlexSans-Regular.woff') format('woff');
                }

                @font-face {
                  font-family: 'IBM Plex Sans';
                  font-style: italic;
                  font-weight: 400;
                  src: url('IBMPlexSans-Italic.woff') format('woff');
                }
                body {
                  font-family: 'IBM Plex Sans', sans-serif;
                  font-style: normal;
                  font-weight: 400;
                }

                ${stylesheet}
              `,
            },
          ],
        });

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '..',
            'testdata',
            'subsetFonts',
            'unused-variant-on-one-page'
          ),
        });
        const text = stringify(htmlObjectTree);
        assetGraph.addAsset({
          url: `${assetGraph.root}index.html`,
          type: 'Html',
          text,
        });
        await assetGraph.populate();
        return expect(assetGraph, 'to render the same after subsetting', {
          omitFallbacks: true,
        });
      },
      'to be valid for all',
      {
        maxIterations: 5,
        generators: [
          html({
            excludedDescendants: new Set([
              'svg',
              'script',
              'style',
              'progress',
            ]),
          }),
          stylesheet,
        ],
      }
    );
  });
});
