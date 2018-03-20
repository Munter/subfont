#!/usr/bin/env node

const yargs = require("yargs");

const commandLineOptions = yargs
  .usage(
    "Create optimal font subsets from your actual font usage.\n$0 [options] <htmlFile(s) | url(s)>"
  )
  .options("h", {
    alias: "help",
    describe: "Show this help",
    type: "boolean",
    default: false
  })
  .options("root", {
    describe:
      "Path to your web root (will be deduced from your input files if not specified)",
    type: "string",
    demand: false
  })
  .options("o", {
    alias: "output",
    describe: "Directory where results should be written to",
    type: "string",
    demand: false
  })
  .options("i", {
    alias: "in-place",
    describe: "Modify HTML-files in-place. Only use on build artifacts",
    type: "boolean",
    default: false
  })
  .options("inline-fonts", {
    describe: "Inline fonts as data-URIs inside the @font-face declaration",
    type: "boolean",
    default: false
  })
  .options("inline-css", {
    describe: "Inline CSS that declares the @font-face for the subset fonts",
    type: "boolean",
    default: false
  })
  .options("font-display", {
    describe:
      "Injects a font-display value into the @font-face CSS. Valid values: auto, block, swap, fallback, optional",
    type: "string",
    default: "swap"
  })
  .options("recursive", {
    alias: "r",
    describe:
      "Crawl all HTML-pages linked with relative and root relative links. This stays inside your domain",
    type: "boolean",
    default: true
  })
  .options("d", {
    alias: "debug",
    describe: "Verbose insights into font glyph detection",
    type: "boolean",
    default: false
  })
  .wrap(72).argv;

const validFontDisplayValues = [
  "auto",
  "block",
  "swap",
  "fallback",
  "optional"
];

if (validFontDisplayValues.indexOf(commandLineOptions["font-display"]) === -1) {
  console.error(
    "Error: Option --font-display must be one of: auto, block, swap, fallback, optional"
  );
  process.exit(1);
}

const urlTools = require("urltools");
let rootUrl =
  commandLineOptions.root &&
  urlTools.urlOrFsPathToUrl(commandLineOptions.root, true);
const outRoot =
  commandLineOptions.output &&
  urlTools.urlOrFsPathToUrl(commandLineOptions.output, true);
const inPlace = commandLineOptions["in-place"];
const inlineSubsets = commandLineOptions["inline-fonts"];
const inlineCss = commandLineOptions["inline-css"];
const fontDisplay = commandLineOptions["font-display"];
const debug = commandLineOptions.debug;
let inputUrls;

if (commandLineOptions._.length > 0) {
  inputUrls = commandLineOptions._.map(function(urlOrFsPath) {
    return urlTools.urlOrFsPathToUrl(String(urlOrFsPath), false);
  });
  if (!rootUrl) {
    rootUrl = urlTools.findCommonUrlPrefix(inputUrls);

    if (rootUrl.indexOf("file:") === -1) {
      rootUrl = urlTools.ensureTrailingSlash(rootUrl);
    }

    if (rootUrl) {
      console.error("Guessing --root from input files: " + rootUrl);
    }
  }
} else if (rootUrl && /^file:/.test(rootUrl)) {
  inputUrls = [rootUrl + "**/*.html"];
  console.error("No input files specified, defaulting to " + inputUrls[0]);
} else {
  console.error(
    "No input files and no --root specified (or it isn't file:), cannot proceed.\n"
  );
  yargs.showHelp();
  process.exit(1);
}

if (inputUrls[0].indexOf("file:") === -1 && !outRoot) {
  console.error("--output has to be specified when using non-file input urls");
  process.exit(1);
}

if (!inPlace && !outRoot) {
  console.error("Either --output or --in-place has to be specified");
  process.exit(1);
}

const AssetGraph = require("assetgraph");

const assetGraphConfig = {
  root: rootUrl
};

if (rootUrl.indexOf("file:") === -1) {
  assetGraphConfig.canonicalRoot = rootUrl.replace(/\/?$/, "/"); // Ensure trailing slash
}

const followRelationsQuery = {
  crossorigin: false
};

if (!commandLineOptions.recursive) {
  followRelationsQuery.type = { $not: { $regex: /Anchor$/ } };
}

const assetGraph = new AssetGraph(assetGraphConfig);
(async () => {
  try {
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
    assetGraph
      .findRelations({ type: "JavaScriptStaticUrl", to: { isLoaded: true } })
      .forEach(function(relation) {
        relation.omitFunctionCall();
      });

    if (!rootUrl.startsWith("file:")) {
      // Root-relative relations:

      for (const relation of assetGraph.findRelations()) {
        if (
          relation.hrefType === "protocolRelative" ||
          relation.hrefType === "absolute"
        ) {
          relation.hrefType = "rootRelative";
        }
      }

      await assetGraph.moveAssets(
        {
          type: "Html",
          isLoaded: true,
          isInline: false,
          fileName: { $or: ["", undefined] }
        },
        function(asset, assetGraph) {
          return (
            asset.url.replace(/\/?$/, "/") + "index" + asset.defaultExtension
          );
        }
      );
    }

    await assetGraph.writeAssetsToDisc(
      {
        isLoaded: true,
        url: url => url.startsWith(assetGraph.root)
      },
      outRoot,
      assetGraph.root
    );

    if (debug) {
      console.log(require("util").inspect(fontInfo, false, 99));
    }
    console.log("Output written to", outRoot);
  } catch (err) {
    console.log(err.stack);
    process.exit(1);
  }
})();
