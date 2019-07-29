const yargs = require('yargs');
const AssetGraph = require('assetgraph');
const prettyBytes = require('pretty-bytes');
const groupBy = require('lodash.groupby');
const urlTools = require('urltools');
const util = require('util');
const subsetFonts = require('./subsetFonts');

async function transferResults(jsHandle) {
  const results = await jsHandle.jsonValue();
  for (const [i, result] of results.entries()) {
    const resultHandle = await jsHandle.getProperty(String(i));
    const elementHandle = await resultHandle.getProperty('node');
    result.node = elementHandle;
  }
  return results;
}

async function tracePageInBrowser(browser, htmlAsset) {
  const page = await browser.newPage();

  await page.goto(htmlAsset.url);
  await page.addScriptTag({
    path: require.resolve('font-tracer/dist/fontTracer.browser.js')
  });
  const jsHandle = await page.evaluateHandle(
    /* global fontTracer */
    /* istanbul ignore next */
    () => fontTracer(document)
  );
  return transferResults(jsHandle);
}

module.exports = async (argv, console) => {
  const {
    root,
    canonicalroot: canonicalRoot,
    output,
    debug,
    dryrun: dryRun,
    silent,
    dynamic,
    'inline-fonts': inlineSubsets,
    'inline-css': inlineCss,
    'font-display': fontDisplay,
    'in-place': inPlace,
    _: nonOptionArgs,
    recursive,
    fallbacks
  } = yargs(argv)
    .usage(
      'Create optimal font subsets from your actual font usage.\n$0 [options] <htmlFile(s) | url(s)>'
    )
    .options('root', {
      describe:
        'Path to your web root (will be deduced from your input files if not specified)',
      type: 'string',
      demand: false
    })
    .options('canonicalroot', {
      describe:
        'URI root where the site will be deployed. Must be either an absolute, a protocol-relative, or a root-relative url',
      type: 'string',
      demand: false
    })
    .options('output', {
      alias: 'o',
      describe: 'Directory where results should be written to',
      type: 'string',
      demand: false
    })
    .options('fallbacks', {
      describe:
        'Include fallbacks so the original font will be loaded when dynamic content gets injected at runtime. Disable with --no-fallbacks',
      type: 'boolean',
      default: true
    })
    .options('dynamic', {
      describe: 'Trace the usage of fonts in a headless browser',
      type: 'boolean',
      default: false
    })
    .options('in-place', {
      alias: 'i',
      describe: 'Modify HTML-files in-place. Only use on build artifacts',
      type: 'boolean',
      default: false
    })
    .options('inline-fonts', {
      describe: 'Inline fonts as data-URIs inside the @font-face declaration',
      type: 'boolean',
      default: false
    })
    .options('inline-css', {
      describe: 'Inline CSS that declares the @font-face for the subset fonts',
      type: 'boolean',
      default: false
    })
    .options('font-display', {
      describe:
        'Injects a font-display value into the @font-face CSS. Valid values: auto, block, swap, fallback, optional',
      type: 'string',
      default: 'swap',
      choices: ['auto', 'block', 'swap', 'fallback', 'optional']
    })
    .options('recursive', {
      alias: 'r',
      describe:
        'Crawl all HTML-pages linked with relative and root relative links. This stays inside your domain',
      type: 'boolean',
      default: true
    })
    .options('no-recursive', {
      describe: 'Do not crawl recursively. Opposite of --recursive option.',
      type: 'boolean',
      default: false
    })
    .options('silent', {
      alias: 's',
      describe: `Do not write anything to stdout`,
      type: 'boolean',
      default: false
    })
    .options('debug', {
      alias: 'd',
      describe: 'Verbose insights into font glyph detection',
      type: 'boolean',
      default: false
    })
    .options('dryrun', {
      describe: `Don't write anything to disk`,
      type: 'boolean',
      default: false
    })
    .wrap(72).argv;

  let rootUrl = root && urlTools.urlOrFsPathToUrl(root, true);
  const outRoot = output && urlTools.urlOrFsPathToUrl(output, true);
  let inputUrls;

  if (nonOptionArgs.length > 0) {
    inputUrls = nonOptionArgs.map(urlOrFsPath =>
      urlTools.urlOrFsPathToUrl(String(urlOrFsPath), false)
    );
    if (!rootUrl) {
      rootUrl = urlTools.findCommonUrlPrefix(inputUrls);

      if (rootUrl) {
        if (rootUrl.startsWith('file:')) {
          console.error(`Guessing --root from input files: ${rootUrl}`);
        } else {
          rootUrl = urlTools.ensureTrailingSlash(rootUrl);
        }
      }
    }
  } else if (rootUrl && rootUrl.startsWith('file:')) {
    inputUrls = [rootUrl + '**/*.html'];
    console.error('No input files specified, defaulting to ' + inputUrls[0]);
  } else {
    console.error(
      "No input files and no --root specified (or it isn't file:), cannot proceed.\n"
    );
    yargs.showHelp();
    process.exit(1);
  }

  if (!inputUrls[0].startsWith('file:') && !outRoot && !dryRun) {
    console.error(
      '--output has to be specified when using non-file input urls'
    );
    process.exit(1);
  }

  if (!inPlace && !outRoot && !dryRun) {
    console.error(
      'Either --output, --in-place, or --dryrun has to be specified'
    );
    process.exit(1);
  }

  const assetGraphConfig = {
    root: rootUrl,
    canonicalRoot
  };

  if (!rootUrl.startsWith('file:')) {
    assetGraphConfig.canonicalRoot = rootUrl.replace(/\/?$/, '/'); // Ensure trailing slash
  }

  const resourceHintTypes = [
    'HtmlPreconnectLink',
    'HtmlPrefetchLink',
    'HtmlPreloadLink',
    'HtmlPrerenderLink',
    'HtmlDnsPrefetchLink'
  ];

  const anchorTypes = ['HtmlAnchor', 'SvgAnchor', 'HtmlMetaRefresh'];

  const noFollowTypes = [
    'HtmlAlternateLink',
    'HtmlOpenGraph',
    'RssChannelLink',
    'JsonUrl',
    'HtmlSearchLink',
    'HtmlIFrameSrcDoc',
    'HtmlIFrame',
    'HtmlFrame'
  ];

  let followRelationsQuery;
  if (recursive) {
    followRelationsQuery = {
      $or: [
        {
          type: {
            $nin: [...anchorTypes, ...resourceHintTypes, ...noFollowTypes]
          }
        },
        {
          type: { $nin: [...resourceHintTypes, ...noFollowTypes] },
          crossorigin: false
        }
      ]
    };
  } else {
    followRelationsQuery = {
      type: {
        $nin: [...anchorTypes, ...resourceHintTypes, ...noFollowTypes]
      }
    };
  }
  const assetGraph = new AssetGraph(assetGraphConfig);

  if (silent) {
    // Avoid failing on assetGraph.warn
    // It would be better if logEvents supported a custom console implementation
    assetGraph.on('warn', () => {});
  } else {
    await assetGraph.logEvents();
  }

  await assetGraph.loadAssets(inputUrls);
  await assetGraph.populate({
    followRelations: followRelationsQuery
  });

  let tracesByAsset;
  if (dynamic) {
    tracesByAsset = new Map();
    const browser = await require('puppeteer').launch();
    try {
      for (const htmlAsset of assetGraph.findAssets({
        type: 'Html',
        isInline: false
      })) {
        tracesByAsset.set(
          htmlAsset,
          await tracePageInBrowser(browser, htmlAsset)
        );
      }
    } finally {
      await browser.close();
    }
  }

  await assetGraph.checkIncompatibleTypes();

  let sumSizesBefore = 0;
  for (const asset of assetGraph.findAssets({
    isInline: false,
    isLoaded: true,
    type: {
      $in: ['Html', 'Css', 'JavaScript']
    }
  })) {
    sumSizesBefore += asset.rawSrc.length;
  }

  const { fontInfo } = await subsetFonts(assetGraph, {
    inlineSubsets,
    inlineCss,
    fontDisplay,
    omitFallbacks: !fallbacks,
    tracesByAsset
  });

  let sumSizesAfter = 0;
  for (const asset of assetGraph.findAssets({
    isInline: false,
    isLoaded: true,
    type: {
      $in: ['Html', 'Css', 'JavaScript']
    }
  })) {
    sumSizesAfter += asset.rawSrc.length;
  }

  // Omit function calls:
  for (const relation of assetGraph.findRelations({
    type: 'JavaScriptStaticUrl',
    to: { isLoaded: true }
  })) {
    relation.omitFunctionCall();
  }

  // Compress inserted javascript
  const preloadPolyfillScripts = assetGraph.findRelations({
    type: 'HtmlScript',
    to: {
      isInline: true,
      outgoingRelations: relation => relation.type === 'JavaScriptStaticUrl'
    }
  });
  await assetGraph.compressJavaScript({
    type: 'JavaScript',
    isLoaded: true,
    outgoingRelations: relation => relation.type === 'JavaScriptStaticUrl'
  });
  for (const relation of preloadPolyfillScripts) {
    relation.inline();
  }

  for (const asset of assetGraph.findAssets({
    isDirty: true,
    isInline: false,
    isLoaded: true,
    type: 'Css'
  })) {
    if (!asset.url.startsWith(assetGraph.root)) {
      assetGraph.info(
        new Error(`Pulling down modified stylesheet ${asset.url}`)
      );
      asset.url = `${assetGraph.root}subfont/${asset.baseName ||
        'index'}-${asset.md5Hex.slice(0, 10)}${asset.extension ||
        asset.defaultExtension}`;
    }
  }

  if (!rootUrl.startsWith('file:')) {
    // Root-relative relations:

    for (const relation of assetGraph.findRelations()) {
      if (
        relation.hrefType === 'protocolRelative' ||
        relation.hrefType === 'absolute'
      ) {
        relation.hrefType = 'rootRelative';
      }
    }

    await assetGraph.moveAssets(
      {
        type: 'Html',
        isLoaded: true,
        isInline: false,
        fileName: { $or: ['', undefined] }
      },
      (asset, assetGraph) =>
        `${asset.url.replace(/\/?$/, '/')}index${asset.defaultExtension}`
    );
  }

  if (!dryRun) {
    await assetGraph.writeAssetsToDisc(
      {
        isLoaded: true,
        url: url => url.startsWith(assetGraph.root)
      },
      outRoot,
      assetGraph.root
    );
  }

  if (debug) {
    console.log(util.inspect(fontInfo, false, 99));
  }

  let totalSavings = sumSizesBefore - sumSizesAfter;
  for (const { htmlAsset, fontUsages } of fontInfo) {
    let sumSmallestSubsetSize = 0;
    let sumSmallestOriginalSize = 0;
    let maxUsedCodePoints = 0;
    let maxOriginalCodePoints = 0;
    for (const fontUsage of fontUsages) {
      sumSmallestSubsetSize += fontUsage.smallestSubsetSize;
      sumSmallestOriginalSize += fontUsage.smallestOriginalSize;
      maxUsedCodePoints = Math.max(
        fontUsage.codepoints.used.length,
        maxUsedCodePoints
      );
      maxOriginalCodePoints = Math.max(
        fontUsage.codepoints.original.length,
        maxOriginalCodePoints
      );
    }
    const fontUsagesByFontFamily = groupBy(
      fontUsages,
      fontUsage => fontUsage.props['font-family']
    );
    const numFonts = Object.keys(fontUsagesByFontFamily).length;
    console.log(
      `${htmlAsset}: ${numFonts} font${numFonts === 1 ? '' : 's'} (${
        fontUsages.length
      } variant${fontUsages.length === 1 ? '' : 's'}) in use, ${prettyBytes(
        sumSmallestOriginalSize
      )} total. Created subsets: ${prettyBytes(sumSmallestSubsetSize)} total`
    );
    for (const fontFamily of Object.keys(fontUsagesByFontFamily).sort()) {
      console.log(`  ${fontFamily}:`);
      for (const fontUsage of fontUsagesByFontFamily[fontFamily]) {
        const variantShortName = `${fontUsage.props['font-weight']}${
          fontUsage.props['font-style'] === 'italic' ? 'i' : ' '
        }`;
        console.log(
          `    ${variantShortName}: ${String(
            fontUsage.codepoints.used.length
          ).padStart(String(maxUsedCodePoints).length)}/${String(
            fontUsage.codepoints.original.length
          ).padStart(
            String(maxOriginalCodePoints).length
          )} codepoints used, ${prettyBytes(fontUsage.smallestOriginalSize)} (${
            fontUsage.smallestOriginalFormat
          }) => ${prettyBytes(fontUsage.smallestSubsetSize)} (${
            fontUsage.smallestSubsetFormat
          })`
        );
        totalSavings +=
          fontUsage.smallestOriginalSize - fontUsage.smallestSubsetSize;
      }
    }
  }
  console.log(
    `HTML/JS/CSS size increase: ${prettyBytes(sumSizesAfter - sumSizesBefore)}`
  );
  console.log(`Total savings: ${prettyBytes(totalSavings)}`);
  if (!dryRun) {
    console.log('Output written to', outRoot || assetGraph.root);
  }

  return assetGraph;
};
