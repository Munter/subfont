const yargs = require('yargs');

module.exports = function parseCommandLineOptions(argv) {
  const {
    root,
    canonicalroot: canonicalRoot,
    output,
    debug,
    dryrun: dryRun,
    silent,
    'inline-fonts': inlineSubsets,
    'inline-css': inlineCss,
    'font-display': fontDisplay,
    'in-place': inPlace,
    _: inputFiles,
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

  return {
    root,
    canonicalRoot,
    output,
    debug,
    dryRun,
    silent,
    inlineSubsets,
    inlineCss,
    fontDisplay,
    inPlace,
    inputFiles,
    recursive,
    fallbacks
  };
};
