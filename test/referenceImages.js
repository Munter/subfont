const expect = require('unexpected').use(require('unexpected-resemble'));
const subsetFonts = require('../lib/subsetFonts');
const AssetGraph = require('assetgraph');
const pathModule = require('path');

function startHttpServer(assetGraph) {
  const server = require('http').createServer((req, res) => {
    let foundAsset;
    if (/\/$/.test(req.url)) {
      const prefixUrl = assetGraph.root + req.url.substr(1);
      foundAsset = assetGraph.findAssets({
        url: `${prefixUrl}index.html`
      })[0];
      if (!foundAsset) {
        res.writeHead(404);
        res.end();
      }
    }
    foundAsset =
      foundAsset ||
      assetGraph.findAssets({
        isLoaded: true,
        url: assetGraph.root + req.url.substr(1)
      })[0];
    if (foundAsset) {
      const etag = `"${foundAsset.md5Hex}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Content-Type', foundAsset.contentType);
      const rawSrc = foundAsset.rawSrc;
      res.setHeader('Content-Length', String(foundAsset.rawSrc.length));
      if (
        req.headers['if-none-match'] &&
        req.headers['if-none-match'].includes(etag)
      ) {
        res.writeHead(304);
        res.end();
      } else {
        res.end(rawSrc);
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolve =>
    server.listen(0, () =>
      resolve([server, `http://localhost:${server.address().port}/`])
    )
  );
}

async function screenshotUrl(browser, url) {
  const page = await browser.newPage();

  await page.goto(url);
  return await page.screenshot();
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
    '<string> to render the same after subsetting',
    async (expect, path) => {
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
      // Consider using https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetrequestinterceptionvalue instead of starting a server
      const [server, url] = await startHttpServer(assetGraph);
      try {
        const screenshotBefore = await screenshotUrl(browser, url);
        await subsetFonts(assetGraph);
        const screenshotAfter = await screenshotUrl(browser, url);
        await expect(screenshotAfter, 'to resemble', screenshotBefore, {
          mismatchPercentage: 0
        });
      } finally {
        server.close();
      }
    }
  );

  it('should include ligatures in the subset', async function() {
    await expect('ligatures', 'to render the same after subsetting');
  });
});
