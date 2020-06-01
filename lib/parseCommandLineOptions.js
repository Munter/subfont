module.exports = function parseCommandLineOptions(argv) {
  let yargs = require('yargs');
  if (argv) {
    yargs = yargs(argv);
  }
  yargs
    .usage(
      'Create optimal font subsets from your actual font usage.\n$0 [options] <htmlFile(s) | url(s)>'
    )
    .options('root', {
      describe:
        'Path to your web root (will be deduced from your input files if not specified)',
      type: 'string',
      demand: false,
    })
    .options('canonical-root', {
      alias: ['canonicalroot'],
      describe:
        'URI root where the site will be deployed. Must be either an absolute, a protocol-relative, or a root-relative url',
      type: 'string',
      demand: false,
    })
    .options('output', {
      alias: 'o',
      describe: 'Directory where results should be written to',
      type: 'string',
      demand: false,
    })
    .options('fallbacks', {
      describe:
        'Include fallbacks so the original font will be loaded when dynamic content gets injected at runtime. Disable with --no-fallbacks',
      type: 'boolean',
      default: true,
    })
    .options('dynamic', {
      describe:
        'Also trace the usage of fonts in a headless browser with JavaScript enabled',
      type: 'boolean',
      default: false,
    })
    .options('in-place', {
      alias: 'i',
      describe: 'Modify HTML-files in-place. Only use on build artifacts',
      type: 'boolean',
      default: false,
    })
    .options('inline-fonts', {
      describe: 'Inline fonts as data-URIs inside the @font-face declaration',
      type: 'boolean',
      default: false,
    })
    .options('inline-css', {
      describe: 'Inline CSS that declares the @font-face for the subset fonts',
      type: 'boolean',
      default: false,
    })
    .options('font-display', {
      describe:
        'Injects a font-display value into the @font-face CSS. Valid values: auto, block, swap, fallback, optional',
      type: 'string',
      default: 'swap',
      choices: ['auto', 'block', 'swap', 'fallback', 'optional'],
    })
    .options('formats', {
      describe: 'Font formats to use when subsetting.',
      type: 'array',
      default: ['woff2', 'woff'],
      choices: ['woff2', 'woff', 'truetype'],
    })
    .options('subset-per-page', {
      describe: 'Create a unique subset for each page.',
      type: 'boolean',
      default: false,
    })
    .options('recursive', {
      alias: 'r',
      describe:
        'Crawl all HTML-pages linked with relative and root relative links. This stays inside your domain',
      type: 'boolean',
      default: false,
    })
    .options('harfbuzz', {
      type: 'boolean',
      describe:
        'Experimental: Use the harfbuzz subsetter instead of pyftsubset. Requires node.js 10+ for wasm support',
      default: false
    })
    .options('silent', {
      alias: 's',
      describe: `Do not write anything to stdout`,
      type: 'boolean',
      default: false,
    })
    .options('debug', {
      alias: 'd',
      describe: 'Verbose insights into font glyph detection',
      type: 'boolean',
      default: false,
    })
    .options('dry-run', {
      alias: ['dry', 'dryrun'],
      describe: `Don't write anything to disk`,
      type: 'boolean',
      default: false,
    })
    .check(({ harfbuzz }) => {
      if (harfbuzz && parseInt(process.versions.node) < 10) {
        return 'The --harfbuzz option requires node.js 10 or above';
      } else {
        return true;
      }
    })
    .wrap(require('yargs').terminalWidth());

  const { _: inputFiles, ...rest } = yargs.argv;

  return {
    yargs,
    inputFiles,
    ...rest,
  };
};
