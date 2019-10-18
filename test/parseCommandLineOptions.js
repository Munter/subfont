const expect = require('unexpected');
const parseCommandLineOptions = require('../lib/parseCommandLineOptions');

describe('parseCommandLineOptions', function() {
  it('should return an object with the parsed options', function() {
    expect(
      parseCommandLineOptions(['--dryrun', '--inline-fonts', '--no-fallbacks']),
      'to satisfy',
      {
        dryRun: true,
        inlineSubsets: true,
        fallbacks: false
      }
    );
  });
});
