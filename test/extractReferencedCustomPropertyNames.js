const expect = require('unexpected').clone().use(require('unexpected-set'));

const extractReferencedCustomPropertyNames = require('../lib/extractReferencedCustomPropertyNames');

describe('extractReferencedCustomPropertyNames', function () {
  it('should return the empty set when no custom properties are referenced', function () {
    expect(
      extractReferencedCustomPropertyNames('foo(bar), local(abc), bla-bla'),
      'to equal',
      new Set()
    );
  });

  it('should return the name of a referenced custom property', function () {
    expect(
      extractReferencedCustomPropertyNames('foo(bar), var(--abc), bla-bla'),
      'to equal',
      new Set(['--abc'])
    );
  });

  it('should return the names of multiple referenced custom properties', function () {
    expect(
      extractReferencedCustomPropertyNames(
        'foo(bar), var(--abc), bla-bla, var(--def)'
      ),
      'to equal',
      new Set(['--abc', '--def'])
    );
  });
});
