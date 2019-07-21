const postcssValuesParser = require('postcss-values-parser');

function extractReferencedCustomPropertyNames(cssValue) {
  const tokens = postcssValuesParser(cssValue).tokens;
  const customPropertyNames = new Set();
  for (let i = 0; i < tokens.length - 3; i += 1) {
    if (
      tokens[i][1] === 'var' &&
      tokens[i + 1][0] === '(' &&
      tokens[i + 2][1] === '--' &&
      tokens[i + 3][0] === 'word'
    ) {
      customPropertyNames.add(`--${tokens[i + 3][1]}`);
    }
  }
  return customPropertyNames;
}

module.exports = extractReferencedCustomPropertyNames;
