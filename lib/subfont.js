const AssetGraph = require('assetgraph');

module.exports = async ({
  rootUrl,
  inputUrls,
  inlineSubsets,
  inlineCss,
  fontDisplay,
  recursive
}) => {
  const assetGraphConfig = {
    root: rootUrl
  };

  if (!rootUrl.startsWith('file:')) {
    assetGraphConfig.canonicalRoot = rootUrl.replace(/\/?$/, '/'); // Ensure trailing slash
  }

  const followRelationsQuery = {
    crossorigin: false
  };

  if (!recursive) {
    followRelationsQuery.type = { $not: { $regex: /Anchor$/ } };
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
