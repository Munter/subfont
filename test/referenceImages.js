const expect = require('unexpected')
  .clone()
  .use(require('unexpected-resemble'));
const subsetFonts = require('../lib/subsetFonts');
const AssetGraph = require('assetgraph');
const pathModule = require('path');

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
    async (expect, path, options = {}) => {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '..',
          'testdata',
          'referenceImages',
          path
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const fontsBefore = assetGraph
        .findAssets({ type: { $in: ['Ttf', 'Woff', 'Woff2', 'Eot'] } })
        .map(asset =>
          asset.url.replace(assetGraph.root, 'https://example.com/')
        );
      const screenshotBefore = await screenshot(browser, assetGraph);
      await subsetFonts(assetGraph, options);
      const screenshotAfter = await screenshot(
        browser,
        assetGraph,
        fontsBefore
      );
      await expect(screenshotAfter, 'to resemble', screenshotBefore, {
        mismatchPercentage: 0
      });
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
});
