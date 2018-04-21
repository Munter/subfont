const AssetGraph = require('assetgraph');

module.exports = async ({
  rootUrl,
  canonicalRootUrl,
  inputUrls,
  inlineSubsets,
  inlineCss,
  fontDisplay,
  recursive
}) => {
  const assetGraphConfig = {
    root: rootUrl,
    canonicalRoot: canonicalRootUrl
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

  let followRelationsQuery;
  if (recursive) {
    followRelationsQuery = {
      $or: [
        {
          type: {
            $nin: [...anchorTypes, ...resourceHintTypes, 'HtmlOpenGraph']
          }
        },
        { type: { $nin: resourceHintTypes }, crossorigin: false }
      ]
    };
  } else {
    followRelationsQuery = {
      type: {
        $nin: [
          ...anchorTypes,
          ...resourceHintTypes,
          'HtmlAlternateLink',
          'HtmlOpenGraph'
        ]
      }
    };
  }
  const assetGraph = new AssetGraph(assetGraphConfig);

  await assetGraph.logEvents();
  await assetGraph.loadAssets(inputUrls);
  await assetGraph.populate({
    followRelations: followRelationsQuery
  });
  const { fontInfo } = await assetGraph.subsetFonts({
    inlineSubsets,
    inlineCss,
    fontDisplay
  });

  // Omit function calls:
  for (const relation of assetGraph.findRelations({
    type: 'JavaScriptStaticUrl',
    to: { isLoaded: true }
  })) {
    relation.omitFunctionCall();
  }

  for (const asset of assetGraph.findAssets({
    isDirty: true,
    isInline: false,
    type: 'Css'
  })) {
    if (!asset.url.startsWith(assetGraph.root)) {
      assetGraph.info(
        new Error(`Pulling down modified stylesheet ${asset.url}`)
      );
      asset.url =
        assetGraph.root + (asset.fileName || `index${asset.defaultExtension}`);
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

  return [assetGraph, fontInfo];
};
