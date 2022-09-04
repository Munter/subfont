const parseFontVariationSettings = require('../lib/parseFontVariationSettings');

describe('parseFontVariationSettings', function () {
  const expect = require('unexpected')
    .clone()
    .addAssertion(
      '<string> to come out as <array>',
      (expect, subject, expectedValue) => {
        const parsedValue = [...parseFontVariationSettings(subject)];
        expect(parsedValue, 'to equal', expectedValue);
      }
    );

  it('should ignore extra whitespace', function () {
    expect(' "FOOB" 200 , "QUUX" 400', 'to come out as', [
      ['FOOB', 200],
      ['QUUX', 400],
    ]);
  });

  describe('with unsupported input', function () {
    it('should ignore content after double comma', function () {
      expect('"FOOB" 200,, "QUUX" 400', 'to come out as', [['FOOB', 200]]);
    });

    it('should ignore content after an axis name given as a non-string', function () {
      expect('"FOOB" 200, 123 400, "BAAZ" 800', 'to come out as', [
        ['FOOB', 200],
      ]);
    });

    it('should ignore a value given as custom property', function () {
      expect('"FOOB" 200, "QUUX" var(--blah), "BAAZ" 800', 'to come out as', [
        ['FOOB', 200],
        ['BAAZ', 800],
      ]);
    });

    it('should ignore a value given as a string', function () {
      expect('"FOOB" "200", "BAAZ" 800', 'to come out as', [['BAAZ', 800]]);
    });
  });
});
