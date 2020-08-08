const expect = require('unexpected');
const parseCommandLineOptions = require('../lib/parseCommandLineOptions');

describe('parseCommandLineOptions', function () {
  it('should return an object with the parsed options', function () {
    expect(
      parseCommandLineOptions(['--dryrun', '--no-fallbacks', '--recursive']),
      'to satisfy',
      {
        root: undefined,
        canonicalRoot: undefined,
        output: undefined,
        debug: false,
        dryRun: true,
        silent: false,
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
});
