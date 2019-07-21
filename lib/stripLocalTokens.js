const postcssValuesParser = require('postcss-values-parser');

module.exports = function stripLocalTokens(cssValue) {
  const tokens = postcssValuesParser(cssValue).tokens;
  for (let i = 0; i < tokens.length - 3; i += 1) {
    if (
      tokens[i][0] === 'word' &&
      tokens[i][1].toLowerCase() === 'local' &&
      tokens[i + 1][0] === '(' &&
      (tokens[i + 2][0] === 'string' || tokens[i + 2][0] === 'word') &&
      tokens[i + 3][0] === ')'
    ) {
      let startIndex = i;
      let numTokensToRemove = 4;
      let commaBefore = false;
      let commaAfter = false;
      while (
        startIndex > 0 &&
        ['space', 'comma'].includes(tokens[startIndex - 1][0])
      ) {
        if (tokens[startIndex - 1][0] === 'comma') {
          commaBefore = true;
        }
        startIndex -= 1;
        numTokensToRemove += 1;
      }

      while (
        startIndex + numTokensToRemove < tokens.length &&
        ['space', 'comma'].includes(tokens[startIndex + numTokensToRemove][0])
      ) {
        if (tokens[startIndex + numTokensToRemove][0] === 'comma') {
          commaAfter = true;
        }
        numTokensToRemove += 1;
      }
      if (commaBefore && commaAfter) {
        tokens.splice(
          startIndex,
          numTokensToRemove,
          ['comma', ','],
          ['space', ' ']
        );
      } else {
        tokens.splice(startIndex, numTokensToRemove);
      }
      i = startIndex - 1;
    }
  }
  return tokens.map(token => token[1]).join('');
};
