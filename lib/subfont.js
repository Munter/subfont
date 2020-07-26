const AssetGraph = require('assetgraph');
const prettyBytes = require('pretty-bytes');
const browsersList = require('browserslist');
const _ = require('lodash');
const urlTools = require('urltools');
const util = require('util');
const subsetFonts = require('./subsetFonts');

module.exports = async function subfont(
  {
    root,
    canonicalRoot,
    output,
    debug = false,
    dryRun = false,
    silent = false,
    inlineFonts = false,
    inlineCss = false,
    fontDisplay = 'swap',
    formats,
    jsPreload,
    subsetPerPage = false,
    inPlace = false,
    inputFiles = [],
    recursive = false,
    fallbacks = true,
    dynamic = false,
    harfbuzz = false,
    browsers,
  },
  console
) {
  let selectedBrowsers;
  if (browsers) {
    selectedBrowsers = browsersList(browsers);
  } else if (browsersList.findConfig('.')) {
    selectedBrowsers = browsersList();
  } else {
    // Default to all browsers
    selectedBrowsers = browsersList('defaults');
  }

  if (!formats) {
    formats = ['woff2'];
    if (
      _.intersection(
        browsersList('supports woff, not supports woff2'),
        selectedBrowsers
      ).length > 0
    ) {
      formats.push('woff');
    }
    if (
      _.intersection(
        browsersList('supports ttf, not supports woff'),
        selectedBrowsers
      ).length > 0
    ) {
      formats.push('truetype');
    }
  }

  if (jsPreload === undefined) {
    jsPreload =
      _.intersection(
        browsersList('supports font-loading, not supports link-rel-preload'),
        selectedBrowsers
      ).length > 0;
  }

  let rootUrl = root && urlTools.urlOrFsPathToUrl(root, true);
  const outRoot = output && urlTools.urlOrFsPathToUrl(output, true);
  let inputUrls;
  if (inputFiles.length > 0) {
    inputUrls = inputFiles.map((urlOrFsPath) =>
      urlTools.urlOrFsPathToUrl(String(urlOrFsPath), false)
    );
    if (!rootUrl) {
      rootUrl = urlTools.findCommonUrlPrefix(inputUrls);

      if (rootUrl) {
        if (rootUrl.startsWith('file:')) {
          console.warn(`Guessing --root from input files: ${rootUrl}`);
        } else {
          rootUrl = urlTools.ensureTrailingSlash(rootUrl);
        }
      }
    }
  } else if (rootUrl && rootUrl.startsWith('file:')) {
    inputUrls = [`${rootUrl}**/*.html`];
    console.warn(`No input files specified, defaulting to ${inputUrls[0]}`);
  } else {
    throw new SyntaxError(
      "No input files and no --root specified (or it isn't file:), cannot proceed.\n"
    );
  }

  if (!inputUrls[0].startsWith('file:') && !outRoot && !dryRun) {
    throw new SyntaxError(
      '--output has to be specified when using non-file input urls'
    );
  }

  if (!inPlace && !outRoot && !dryRun) {
    throw new SyntaxError(
      'Either --output, --in-place, or --dry-run has to be specified'
    );
  }

  const assetGraphConfig = {
    root: rootUrl,
    canonicalRoot,
  };

  if (!rootUrl.startsWith('file:')) {
    assetGraphConfig.canonicalRoot = rootUrl.replace(/\/?$/, '/'); // Ensure trailing slash
  }

  const resourceHintTypes = [
    'HtmlPreconnectLink',
    'HtmlPrefetchLink',
    'HtmlPreloadLink',
    'HtmlPrerenderLink',
    'HtmlDnsPrefetchLink',
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
    'HtmlFrame',
    'JavaScriptSourceMappingUrl',
    'SourceMapFile',
    'SourceMapSource',
  ];

  let followRelationsQuery;
  if (recursive) {
    followRelationsQuery = {
      $or: [
        {
          type: {
            $nin: [...anchorTypes, ...resourceHintTypes, ...noFollowTypes],
          },
        },
        {
          type: { $nin: [...resourceHintTypes, ...noFollowTypes] },
          crossorigin: false,
        },
      ],
    };
  } else {
    followRelationsQuery = {
      type: {
        $nin: [...anchorTypes, ...resourceHintTypes, ...noFollowTypes],
      },
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
    followRelations: followRelationsQuery,
  });

  await assetGraph.checkIncompatibleTypes();

  const entrypointAssets = assetGraph.findAssets({ isInitial: true });
  const redirectOrigins = new Set();
  for (const relation of assetGraph
    .findRelations({ type: 'HttpRedirect' })
    .sort((a, b) => a.id - b.id)) {
    if (relation.from.isInitial) {
      assetGraph.info(
        new Error(`${relation.from.url} redirected to ${relation.to.url}`)
      );
      relation.to.isInitial = true;
      relation.from.isInitial = false;

      redirectOrigins.add(relation.to.origin);
    }
  }
  if (
    entrypointAssets.length === redirectOrigins.size &&
    redirectOrigins.size === 1
  ) {
    const newRoot = `${[...redirectOrigins][0]}/`;
    if (newRoot !== assetGraph.root) {
      assetGraph.info(
        new Error(
          `All entrypoints redirected, changing root from ${assetGraph.root} to ${newRoot}`
        )
      );
      assetGraph.root = newRoot;
    }
  }

  let sumSizesBefore = 0;
  for (const asset of assetGraph.findAssets({
    isInline: false,
    isLoaded: true,
    type: {
      $in: ['Html', 'Css', 'JavaScript'],
    },
  })) {
    sumSizesBefore += asset.rawSrc.length;
  }

  const { fontInfo } = await subsetFonts(assetGraph, {
    inlineFonts,
    inlineCss,
    fontDisplay,
    subsetPerPage,
    formats,
    jsPreload,
    omitFallbacks: !fallbacks,
    harfbuzz,
    dynamic,
    console,
  });

  let sumSizesAfter = 0;
  for (const asset of assetGraph.findAssets({
    isInline: false,
    isLoaded: true,
    type: {
      $in: ['Html', 'Css', 'JavaScript'],
    },
  })) {
    sumSizesAfter += asset.rawSrc.length;
  }

  // Omit function calls:
  for (const relation of assetGraph.findRelations({
    type: 'JavaScriptStaticUrl',
    to: { isLoaded: true },
  })) {
    relation.omitFunctionCall();
  }

  // Compress inserted javascript
  const preloadPolyfillScripts = assetGraph.findRelations({
    type: 'HtmlScript',
    to: {
      isInline: true,
      outgoingRelations: (relation) => relation.type === 'JavaScriptStaticUrl',
    },
  });
  await assetGraph.compressJavaScript({
    type: 'JavaScript',
    isLoaded: true,
    outgoingRelations: (relation) => relation.type === 'JavaScriptStaticUrl',
  });
  for (const relation of preloadPolyfillScripts) {
    relation.inline();
  }

  for (const asset of assetGraph.findAssets({
    isDirty: true,
    isInline: false,
    isLoaded: true,
    type: 'Css',
  })) {
    if (!asset.url.startsWith(assetGraph.root)) {
      assetGraph.info(
        new Error(`Pulling down modified stylesheet ${asset.url}`)
      );
      asset.url = `${assetGraph.root}subfont/${
        asset.baseName || 'index'
      }-${asset.md5Hex.slice(0, 10)}${
        asset.extension || asset.defaultExtension
      }`;
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
        fileName: { $or: ['', undefined] },
      },
      (asset, assetGraph) =>
        `${asset.url.replace(/\/?$/, '/')}index${asset.defaultExtension}`
    );
  }

  if (!dryRun) {
    await assetGraph.writeAssetsToDisc(
      {
        isLoaded: true,
        isRedirect: { $ne: true },
        url: (url) => url.startsWith(assetGraph.root),
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
      sumSmallestSubsetSize += fontUsage.smallestSubsetSize || 0;
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
    const fontUsagesByFontFamily = _.groupBy(
      fontUsages,
      (fontUsage) => fontUsage.props['font-family']
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
        let status = `    ${variantShortName}: ${String(
          fontUsage.codepoints.used.length
        ).padStart(String(maxUsedCodePoints).length)}/${String(
          fontUsage.codepoints.original.length
        ).padStart(String(maxOriginalCodePoints).length)} codepoints used`;
        if (
          !subsetPerPage &&
          fontUsage.codepoints.page.length !== fontUsage.codepoints.used.length
        ) {
          status += ` (${fontUsage.codepoints.page.length} on this page)`;
        }
        if (
          fontUsage.smallestOriginalSize !== undefined &&
          fontUsage.smallestSubsetSize !== undefined
        ) {
          status += `, ${prettyBytes(fontUsage.smallestOriginalSize)} (${
            fontUsage.smallestOriginalFormat
          }) => ${prettyBytes(fontUsage.smallestSubsetSize)} (${
            fontUsage.smallestSubsetFormat
          })`;
          totalSavings +=
            fontUsage.smallestOriginalSize - fontUsage.smallestSubsetSize;
        } else {
          status += ', no subset font created';
        }
        console.log(status);
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
