#!/usr/bin/env node

const yargs = require('yargs');
const subfont = require('./subfont');
const {
  root,
  output,
  debug,
  'inline-fonts': inlineFonts,
  'inline-css': inlineCss,
  'font-display': fontDisplay,
  'in-place': inPlace,
  _: nonOptionArgs,
  recursive
} = yargs
  .usage(
    'Create optimal font subsets from your actual font usage.\n$0 [options] <htmlFile(s) | url(s)>'
  )
  .options('root', {
    describe:
      'Path to your web root (will be deduced from your input files if not specified)',
    type: 'string',
    demand: false
  })
  .options('output', {
    alias: 'o',
    describe: 'Directory where results should be written to',
    type: 'string',
    demand: false
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
  .options('debug', {
    alias: 'd',
    describe: 'Verbose insights into font glyph detection',
    type: 'boolean',
    default: false
  })
  .wrap(72).argv;

const urlTools = require('urltools');
let rootUrl = root && urlTools.urlOrFsPathToUrl(root, true);
const outRoot = output && urlTools.urlOrFsPathToUrl(output, true);
let inputUrls;

if (nonOptionArgs.length > 0) {
  inputUrls = nonOptionArgs.map(urlOrFsPath =>
    urlTools.urlOrFsPathToUrl(String(urlOrFsPath), false)
  );
  if (!rootUrl) {
    rootUrl = urlTools.findCommonUrlPrefix(inputUrls);

    if (!rootUrl.startsWith('file:')) {
      rootUrl = urlTools.ensureTrailingSlash(rootUrl);
    }

    if (rootUrl) {
      console.error('Guessing --root from input files: ' + rootUrl);
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

if (!inputUrls[0].startsWith('file:') && !outRoot) {
  console.error('--output has to be specified when using non-file input urls');
  process.exit(1);
}

if (!inPlace && !outRoot) {
  console.error('Either --output or --in-place has to be specified');
  process.exit(1);
}

(async () => {
  try {
    const [assetGraph, fontInfo] = await subfont({
      rootUrl,
      inputUrls,
      inlineSubsets: inlineFonts,
      inlineCss,
      fontDisplay,
      recursive
    });

    await assetGraph.writeAssetsToDisc(
      {
        isLoaded: true,
        url: url => url.startsWith(assetGraph.root)
      },
      outRoot,
      assetGraph.root
    );

    if (debug) {
      console.log(require('util').inspect(fontInfo, false, 99));
    }
    console.log('Output written to', outRoot);
  } catch (err) {
    console.log(err.stack);
    process.exit(1);
  }
})();
