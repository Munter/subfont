const urlTools = require('urltools');
const puppeteer = require('puppeteer-core');

async function transferResults(jsHandle) {
  const results = await jsHandle.jsonValue();
  for (const [i, result] of results.entries()) {
    const resultHandle = await jsHandle.getProperty(String(i));
    const elementHandle = await resultHandle.getProperty('node');
    result.node = elementHandle;
  }
  return results;
}

async function downloadOrLocatePreferredBrowserRevision() {
  const browserFetcher = puppeteer.createBrowserFetcher();
  const preferredRevision = puppeteer._launcher._preferredRevision;
  const localRevisions = await browserFetcher.localRevisions();
  let revisionInfo;
  if (localRevisions.includes(preferredRevision)) {
    revisionInfo = await browserFetcher.revisionInfo(preferredRevision);
  } else {
    console.log(`Downloading Chromium ${preferredRevision}`);
    revisionInfo = await browserFetcher.download(preferredRevision);
  }
  return puppeteer.launch({
    executablePath: revisionInfo.executablePath,
  });
}

class HeadlessBrowser {
  constructor({ console }) {
    this.console = console;
  }

  _ensureBrowserDownloaded() {}

  _launchBrowserMemoized() {
    // Make sure we only download and launch one browser per HeadlessBrowser instance
    return (this._launchPromise =
      this._launchPromise || downloadOrLocatePreferredBrowserRevision());
  }

  async tracePage(htmlAsset) {
    const assetGraph = htmlAsset.assetGraph;
    const browser = await this._launchBrowserMemoized();
    const page = await browser.newPage();

    // Make up a base url to map to the assetgraph root.
    // Use the canonical root if available, so that it'll be
    // easier to handle absolute and protocol-relative urls pointing
    // at it, as well as fall through to the actual domain if some
    // assets aren't found in the graph.
    const baseUrl = assetGraph.canonicalRoot
      ? assetGraph.canonicalRoot.replace(/\/?$/, '/')
      : 'https://example.com/';

    // Intercept all requests made by the headless browser, and
    // fake a response from the assetgraph instance if the corresponding
    // asset is found there:
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(baseUrl)) {
        let agUrl = url.replace(baseUrl, assetGraph.root);
        if (/\/$/.test(agUrl)) {
          agUrl += 'index.html';
        }
        const asset = assetGraph.findAssets({
          isLoaded: true,
          url: agUrl,
        })[0];
        if (asset) {
          request.respond({
            status: 200,
            contentType: asset.contentType,
            body: asset.rawSrc,
          });
          return;
        }
      }
      // Not found, let the original request through:
      request.continue();
    });

    page.on('requestfailed', (request) => {
      const response = request.response();
      if (response && response.status() > 400) {
        this.console.error(
          `${request.method()} ${request.url()} returned ${response.status()}`
        );
      } else {
        this.console.error(
          `${request.method()} ${request.url()} failed: ${
            request.failure().errorText
          }`
        );
      }
    });

    page.on('pageerror', this.console.error);
    page.on('error', this.console.error);

    // Prevent the CSP of the page from rejecting our injection of font-tracer
    await page.setBypassCSP(true);

    await page.goto(
      urlTools.resolveUrl(
        baseUrl,
        urlTools.buildRelativeUrl(assetGraph.root, htmlAsset.url)
      )
    );

    await page.addScriptTag({
      path: require.resolve('font-tracer/dist/fontTracer.browser.js'),
    });

    const jsHandle = await page.evaluateHandle(
      /* global fontTracer */
      /* istanbul ignore next */
      () => fontTracer(document)
    );
    return transferResults(jsHandle);
  }

  async close() {
    const launchPromise = this._launchPromise;
    if (launchPromise) {
      this._launchPromise = undefined;
      const browser = await launchPromise;
      await browser.close();
    }
  }
}

module.exports = HeadlessBrowser;
