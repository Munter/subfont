const expect = require('unexpected');
const unicodeRange = require('../lib/unicodeRange');

describe('unicode range', function () {
  // https://github.com/Munter/subfont/issues/106
  it('should compress into a range', function () {
    expect(unicodeRange([0x64, 0x20, 0x62, 0x63]), 'to equal', 'U+20,U+62-64');
  });

  it('should handle emojis', function () {
    expect(
      unicodeRange(['📋', '🔑', '🫆'].map((c) => c.codePointAt(0))),
      'to equal',
      'U+1F4CB,U+1F511,U+1FAC6',
    );
  });
});
