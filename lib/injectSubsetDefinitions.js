const postcssValuesParser = require('postcss-values-parser');
const unquote = require('./unquote');

function injectSubsetDefinitions(cssValue, webfontNameMap, replaceOriginal) {
  const subsetFontNames = new Set(
    Object.values(webfontNameMap).map(name => name.toLowerCase())
  );
  const tokens = postcssValuesParser(cssValue).tokens;
  let resultStr = '';
  let isPreceededByWords = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    let possibleFontFamily;
    let lastFontFamilyTokenIndex = i;
    if (token[0] === 'string') {
      possibleFontFamily = unquote(token[1]);
    } else if (token[0] === 'word') {
      if (!isPreceededByWords) {
        const wordSequence = [];
        for (let j = i; j < tokens.length; j += 1) {
          if (tokens[j][0] === 'word') {
            wordSequence.push(tokens[j][1]);
            lastFontFamilyTokenIndex = j;
          } else if (tokens[j][0] !== 'space') {
            break;
          }
        }
        possibleFontFamily = wordSequence.join(' ');
      }
      isPreceededByWords = true;
    } else if (token[0] !== 'space') {
      isPreceededByWords = false;
    }
    if (possibleFontFamily) {
      const possibleFontFamilyLowerCase = possibleFontFamily.toLowerCase();
      if (subsetFontNames.has(possibleFontFamilyLowerCase)) {
        // Bail out, a subset font is already listed
        return cssValue;
      } else if (webfontNameMap[possibleFontFamilyLowerCase]) {
        resultStr += `'${webfontNameMap[possibleFontFamilyLowerCase].replace(
          /'/g,
          "\\'"
        )}'`;
        if (replaceOriginal) {
          tokens.splice(i, lastFontFamilyTokenIndex - i + 1);
          i -= 1;
          continue;
        } else {
          resultStr += ', ';
        }
      }
    }
    resultStr += token[1];
  }
  return resultStr;
}

module.exports = injectSubsetDefinitions;
