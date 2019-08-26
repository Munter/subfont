const expect = require('unexpected').clone();
const stripLocalTokens = require('../lib/stripLocalTokens');

expect.addAssertion(
  '<string> to come out as <string>',
  (expect, subject, value) => {
    expect(stripLocalTokens(subject), 'to equal', value);
  }
);

describe('stripLocalTokens', function() {
  it('should strip a standalone local(...) token', function() {
    expect('local(foo)', 'to come out as', '');
  });

  it('should strip an initial local(...) token and a following comma', function() {
    expect('local(foo), url(bar)', 'to come out as', 'url(bar)');
  });

  it('should strip a local(...) token surrounded by multple other tokens and leave a comma', function() {
    expect(
      'url(foo), local(bar), url(quux)',
      'to come out as',
      'url(foo), url(quux)'
    );
  });

  it('should ignore the casing of the word local', function() {
    expect(
      'url(foo), LOCAL(bar), url(quux)',
      'to come out as',
      'url(foo), url(quux)'
    );
  });

  it('should support singlequoted strings', function() {
    expect(
      `url('foo'), local('bar'), url('quux')`,
      'to come out as',
      "url('foo'), url('quux')"
    );
  });

  it('should support doublequoted strings', function() {
    expect(
      `url("foo"), local("bar"), url("quux")`,
      'to come out as',
      'url("foo"), url("quux")'
    );
  });

  it('should strip multiple consecutive local(...) tokens with space between them', function() {
    expect(
      `url('foo'), local(bar), local(quux), url('baz')`,
      'to come out as',
      "url('foo'), url('baz')"
    );
  });

  it('should strip multiple consecutive local(...) tokens with space before and after the comma', function() {
    expect(
      `url('foo') , local(bar) , local(quux) , url('baz')`,
      'to come out as',
      "url('foo') , url('baz')"
    );
  });

  it('should strip multiple initial, consecutive local(...) tokens', function() {
    expect(
      `local('Roboto Bold Italic'), local('Roboto-BoldItalic'), url(KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format('woff')`,
      'to come out as',
      `url(KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format('woff')`
    );
  });

  it('should strip multiple consecutive local(...) tokens without space between them', function() {
    expect(
      `url('foo'), local(bar),local(quux), url('baz')`,
      'to come out as',
      "url('foo'), url('baz')"
    );
  });
});
