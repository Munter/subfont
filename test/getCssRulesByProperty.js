var expect = require('unexpected');
var getRules = require('../lib/getCssRulesByProperty');

describe('getCssRulesByProperty', function () {
  it('should throw when not passing an array of properties as first argument', function () {
    expect(getRules, 'to throw', 'properties argument must be an array');
  });

  it('should throw when not passing a cssSource as second argument', function () {
    expect(
      function () {
        getRules(['padding']);
      },
      'to throw',
      'cssSource argument must be a string containing valid CSS'
    );
  });

  it('should throw when not passing a valid CSS document in cssSource', function () {
    expect(function () {
      getRules(['padding'], 'sdkjlasjdlk');
    }, 'to throw');
  });

  it('should return empty arrays when no properties apply', function () {
    expect(
      getRules(['padding'], 'h1 { color: red; }', []),
      'to exhaustively satisfy',
      {
        counterStyles: [],
        keyframes: [],
        padding: [],
      }
    );
  });

  it('should return an array of matching property values', function () {
    expect(
      getRules(['color'], 'h1 { color: red; } h2 { color: blue; }', []),
      'to exhaustively satisfy',
      {
        counterStyles: [],
        keyframes: [],
        color: [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'color',
            value: 'red',
            important: false,
          },
          {
            selector: 'h2',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'color',
            value: 'blue',
            important: false,
          },
        ],
      }
    );
  });

  it('should handle inline styles through `bogusselector`-selector', function () {
    expect(
      getRules(['color'], 'bogusselector { color: red; }', []),
      'to exhaustively satisfy',
      {
        counterStyles: [],
        keyframes: [],
        color: [
          {
            selector: undefined,
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [1, 0, 0, 0],
            prop: 'color',
            value: 'red',
            important: false,
          },
        ],
      }
    );
  });

  describe('overridden values', function () {
    it('should return the last defined value', function () {
      expect(
        getRules(['color'], 'h1 { color: red; color: blue; }', []),
        'to exhaustively satisfy',
        {
          counterStyles: [],
          keyframes: [],
          color: [
            {
              selector: 'h1',
              predicates: {},
              namespaceURI: undefined,
              specificityArray: [0, 0, 0, 1],
              prop: 'color',
              value: 'red',
              important: false,
            },
            {
              selector: 'h1',
              predicates: {},
              namespaceURI: undefined,
              specificityArray: [0, 0, 0, 1],
              prop: 'color',
              value: 'blue',
              important: false,
            },
          ],
        }
      );
    });
  });

  describe('shorthand font-property', function () {
    it('register the longhand value from a valid shorthand', function () {
      var result = getRules(
        ['font-family', 'font-size'],
        'h1 { font: 15px serif; }',
        []
      );

      expect(result, 'to exhaustively satisfy', {
        counterStyles: [],
        keyframes: [],
        'font-family': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
        'font-size': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
      });
    });

    it('should set initial values for requested properties which are not defined in shorthand', function () {
      var result = getRules(
        ['font-family', 'font-size', 'font-style', 'font-weight'],
        'h1 { font: 15px serif; }',
        []
      );

      expect(result, 'to exhaustively satisfy', {
        counterStyles: [],
        keyframes: [],
        'font-family': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
        'font-size': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
        'font-style': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
        'font-weight': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
      });
    });

    it('register the longhand value from a shorthand', function () {
      var result = getRules(
        ['font-family', 'font-size'],
        'h1 { font-size: 10px; font: 15px serif; font-size: 20px }',
        []
      );

      expect(result, 'to exhaustively satisfy', {
        counterStyles: [],
        keyframes: [],
        'font-family': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
        ],
        'font-size': [
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font-size',
            value: '10px',
            important: false,
          },
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font',
            value: '15px serif',
            important: false,
          },
          {
            selector: 'h1',
            predicates: {},
            namespaceURI: undefined,
            specificityArray: [0, 0, 0, 1],
            prop: 'font-size',
            value: '20px',
            important: false,
          },
        ],
      });
    });
  });

  describe('with a different default namespace', function () {
    describe('given as a quoted string', function () {
      it('should annotate the style rules with the default namespace', function () {
        const result = getRules(
          ['font-size'],
          '@namespace "foo"; h1 { font-size: 20px }',
          []
        );

        expect(result, 'to satisfy', {
          'font-size': [
            {
              selector: 'h1',
              namespaceURI: 'foo',
              value: '20px',
            },
          ],
        });
      });
    });

    describe('given as a url(...)', function () {
      it('should annotate the style rules with the default namespace', function () {
        const result = getRules(
          ['font-size'],
          '@namespace url(foo); h1 { font-size: 20px }',
          []
        );

        expect(result, 'to satisfy', {
          'font-size': [
            {
              selector: 'h1',
              namespaceURI: 'foo',
              value: '20px',
            },
          ],
        });
      });
    });

    describe('given as a url("...")', function () {
      it('should annotate the style rules with the default namespace', function () {
        const result = getRules(
          ['font-size'],
          '@namespace url("foo"); h1 { font-size: 20px }',
          []
        );

        expect(result, 'to satisfy', {
          'font-size': [
            {
              selector: 'h1',
              namespaceURI: 'foo',
              value: '20px',
            },
          ],
        });
      });
    });
  });
});
