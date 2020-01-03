const expect = require('unexpected')
  .clone()
  .use(require('unexpected-resemble'))
  .use(require('unexpected-check'))
  .use(require('magicpen-prism'));
const subsetFonts = require('../lib/subsetFonts');
const pathModule = require('path');
const AssetGraph = require('assetgraph');

let browser;
async function getBrowser() {
  if (!browser) {
    browser = await require('puppeteer').launch();

    after(async function() {
      await browser.close();
    });
  }
  return browser;
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
    const [htmlAsset] = await assetGraph.loadAssets('index.html');
    const originalText = htmlAsset.text;
    expect.subjectOutput = output => {
      output.code(originalText, 'html');
    };

    await assetGraph.populate();
    const browser = await getBrowser();
    const fontsBefore = assetGraph
      .findAssets({ type: { $in: ['Ttf', 'Woff', 'Woff2', 'Eot'] } })
      .map(asset => asset.url.replace(assetGraph.root, 'https://example.com/'));
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

module.exports = expect;
