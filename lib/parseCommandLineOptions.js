const _ = require('lodash');

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
    .options('browsers', {
      describe:
        "Override your projects browserslist configuration to specify which browsers to support. Controls font formats and polyfill. Defaults to browserslist's default query if your project has no browserslist configuration",
      type: 'string',
      demand: false,
    })
    .options('formats', {
      describe:
        'Font formats to use when subsetting. The default is to select the formats based on the browser capabilities as specified via --browsers or the browserslist configuration.',
      type: 'string', // type: 'array' is weird: https://github.com/yargs/yargs/issues/846
      choices: ['woff2', 'woff', 'truetype'],
      coerce(formats) {
        // Make sure we support comma-separated syntax: --format truetype,woff
        return _.flatten(
          _.flatten([formats]).map((format) => format.split(','))
        );
      },
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
    .options('inline-css', {
      describe: 'Inline CSS that declares the @font-face for the subset fonts',
      type: 'boolean',
      default: false,
    })
    .options('font-display', {
      describe: 'Injects a font-display value into the @font-face CSS.',
      type: 'string',
      default: 'swap',
      choices: ['auto', 'block', 'swap', 'fallback', 'optional'],
    })
    .options('recursive', {
      alias: 'r',
      describe:
        'Crawl all HTML-pages linked with relative and root relative links. This stays inside your domain',
      type: 'boolean',
      default: false,
    })
    .options('relative-urls', {
      describe: 'Issue relative urls instead of root-relative ones',
      type: 'boolean',
      default: false,
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
    .check(({ harfbuzz, subsetPerPage, inlineFonts }) => {
      // Fail instead of silently ignoring legacy switches.
      // This prevents --subset-per-page etc. from implicitly being interpreted as 'string',
      // which means that it would consume a following non-option cli param
      if (subsetPerPage !== undefined) {
        return '--[no-]subset-per-page is no longer supported as of subfont 6.0.0';
      }
      if (inlineFonts !== undefined) {
        return '--[no-]inline-fonts is no longer supported as of subfont 6.0.0';
      }
      if (harfbuzz !== undefined) {
        return '--[no-]harfbuzz is no longer supported as of subfont 6.0.0 (harfbuzz is always used now)';
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
