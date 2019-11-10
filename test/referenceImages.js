const expect = require('unexpected')
  .clone()
  .use(require('unexpected-resemble'))
  .use(require('unexpected-check'));
const fs = require('fs');
const { html } = require('html-generators');
const { stylesheet } = require('css-generators');
const subsetFonts = require('../lib/subsetFonts');
const AssetGraph = require('assetgraph');
const pathModule = require('path');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function stringify({ type, tag, value, attributes, children }) {
  if (type === 'tag') {
    const stringifiedAttributes = Object.keys(attributes)
      .map(attributeName =>
        attributes[attributeName] === null
          ? ` ${attributeName}`
          : ` ${attributeName}="${escapeHtml(attributes[attributeName])}"`
      )
      .join('');
    return `<${tag}${stringifiedAttributes}>${children
      .map(stringify)
      .join('')}</${tag}>`;
  } else {
    // type === 'text'
    return escapeHtml(value);
  }
}

function fixupUnsupportedHtmlConstructs(obj) {
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
}

async function screenshot(browser, assetGraph, bannedUrls) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  const loadedUrls = [];
  page.on('request', request => {
    const url = request.url();
    loadedUrls.push(url);
    if (url.startsWith('https://example.com/')) {
      let agUrl = url.replace('https://example.com/', assetGraph.root);
      if (/\/$/.test(agUrl)) {
        agUrl += 'index.html';
      }
      const asset = assetGraph.findAssets({
        isLoaded: true,
        url: agUrl
      })[0];
      if (asset) {
        request.respond({
          status: 200,
          contentType: asset.contentType,
          body: asset.rawSrc
        });
        return;
      }
    }
    request.continue();
  });
  await page.goto('https://example.com/');
  if (bannedUrls) {
    const loadedBannedUrls = loadedUrls.filter(url => bannedUrls.includes(url));
    if (loadedBannedUrls.length > 0) {
      throw new Error(
        `One or more of the original fonts were loaded:\n  ${loadedBannedUrls.join(
          '\n  '
        )}`
      );
    }
  }
  const screenshot = await page.screenshot();
  await page.close();
  return screenshot;
}

describe('reference images', function() {
  let browser;
  before(async function() {
    browser = await require('puppeteer').launch();
  });

  after(async function() {
    await browser.close();
  });

  expect.addAssertion(
    '<string> to render the same after subsetting <object?>',
    (expect, path, ...rest) => {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'referenceImages',
          path
        )
      });
      return expect(assetGraph, 'to render the same after subsetting', ...rest);
    }
  );

  expect.addAssertion(
    '<object> to render the same after subsetting <object?>',
    async (expect, assetGraph, options = {}) => {
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const fontsBefore = assetGraph
        .findAssets({ type: { $in: ['Ttf', 'Woff', 'Woff2', 'Eot'] } })
        .map(asset =>
          asset.url.replace(assetGraph.root, 'https://example.com/')
        );
      const screenshotBefore = await screenshot(browser, assetGraph);
      const { fontInfo } = await subsetFonts(assetGraph, options);
      if (fontInfo.length > 0) {
        const screenshotAfter = await screenshot(
          browser,
          assetGraph,
          fontsBefore
        );
        await expect(screenshotAfter, 'to resemble', screenshotBefore, {
          mismatchPercentage: 0
        });
      }
    }
  );

  for (const inlineCss of [true, false]) {
    describe(`with inlineCss:${inlineCss}`, function() {
      for (const inlineFonts of [true, false]) {
        describe(`with inlineFonts:${inlineFonts}`, function() {
          for (const omitFallbacks of [true, false]) {
            describe(`with omitFallbacks:${omitFallbacks}`, function() {
              it('should render a simple test case without ligatures', async function() {
                await expect(
                  'withoutLigatures',
                  'to render the same after subsetting',
                  {
                    inlineCss,
                    inlineFonts,
                    omitFallbacks
                  }
                );
              });

              it('should render ligatures correctly', async function() {
                await expect(
                  'ligatures',
                  'to render the same after subsetting',
                  {
                    inlineCss,
                    inlineFonts,
                    omitFallbacks
                  }
                );
              });
            });
          }
        });
      }
    });
  }

  describe('generated html', function() {
    let smileySvgBase64;

    before(async function() {
      smileySvgBase64 = `data:image/svg+xml;base64,${fs
        .readFileSync(
          pathModule.resolve(__dirname, '..', 'testdata', 'smiley.svg')
        )
        .toString('base64')}`;
    });

    it('should render the same before and after subsetting', async function() {
      return expect(
        async (htmlObjectTree, stylesheet) => {
          fixupUnsupportedHtmlConstructs(htmlObjectTree);

          stylesheet = stylesheet.replace(
            /url\([^\)]*\)/g,
            `url(${smileySvgBase64})`
          );
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
              `
              }
            ]
          });

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '..',
              'testdata',
              'subsetFonts',
              'unused-variant-on-one-page'
            )
          });
          const text = stringify(htmlObjectTree);
          assetGraph.addAsset({
            url: `${assetGraph.root}index.html`,
            type: 'Html',
            text
          });
          await assetGraph.populate();
          return expect(assetGraph, 'to render the same after subsetting', {
            omitFallbacks: true
          });
        },
        'to be valid for all',
        html({
          excludedDescendants: new Set(['svg', 'script', 'style', 'progress'])
        }),
        stylesheet
      );
    });
  });
});
