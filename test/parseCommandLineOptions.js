const expect = require('unexpected');
const parseCommandLineOptions = require('../lib/parseCommandLineOptions');

describe('parseCommandLineOptions', function () {
  it('should return an object with the parsed options', function () {
    expect(
      parseCommandLineOptions([
        '--dryrun',
        '--inline-fonts',
        '--no-fallbacks',
        '--recursive',
      ]),
      'to satisfy',
      {
        root: undefined,
        canonicalRoot: undefined,
        output: undefined,
        debug: false,
        dryRun: true,
        silent: false,
        inlineFonts: true,
        inlineCss: false,
        fontDisplay: 'swap',
        inPlace: false,
        inputFiles: [],
        recursive: true,
        fallbacks: false,
        dynamic: false,
        harfbuzz: false,
      }
    );
  });

  it('should allow repeating --formats', function () {
    expect(
      parseCommandLineOptions(['--formats', 'truetype', '--formats', 'woff2']),
      'to satisfy',
      {
        formats: ['truetype', 'woff2'],
      }
    );
  });

  it('should allow passing a comma-separated list of formats', function () {
    const options = parseCommandLineOptions(['--formats', 'truetype,woff2']);

    expect(options, 'to satisfy', {
      formats: ['truetype', 'woff2'],
    });
  });
});
