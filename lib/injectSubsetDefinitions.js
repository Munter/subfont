const postcssValuesParser = require('postcss-values-parser');
const unquote = require('./unquote');

function injectSubsetDefinitions(cssValue, webfontNameMap, replaceOriginal) {
  const subsetFontNames = new Set(
    Object.values(webfontNameMap).map(name => name.toLowerCase())
  );
  const rootNode = postcssValuesParser.parse(cssValue);
  let isPreceededByWords = false;
  for (const [i, node] of rootNode.nodes.entries()) {
    let possibleFontFamily;
    let lastFontFamilyTokenIndex = i;
    if (node.type === 'quoted') {
      possibleFontFamily = unquote(node.value);
    } else if (node.type === 'word') {
      if (!isPreceededByWords) {
        const wordSequence = [];
        for (let j = i; j < rootNode.nodes.length; j += 1) {
          if (rootNode.nodes[j].type === 'word') {
            wordSequence.push(rootNode.nodes[j].value);
            lastFontFamilyTokenIndex = j;
          } else {
            break;
          }
        }
        possibleFontFamily = wordSequence.join(' ');
      }
      isPreceededByWords = true;
    } else {
      isPreceededByWords = false;
    }
    if (possibleFontFamily) {
      const possibleFontFamilyLowerCase = possibleFontFamily.toLowerCase();
      if (subsetFontNames.has(possibleFontFamilyLowerCase)) {
        // Bail out, a subset font is already listed
        return cssValue;
      } else if (webfontNameMap[possibleFontFamilyLowerCase]) {
        rootNode.insertBefore(
          node,
          `'${webfontNameMap[possibleFontFamilyLowerCase].replace(
            /'/g,
            "\\'"
          )}', `
        );
        return rootNode.toString();
        if (replaceOriginal) {
          tokens.splice(i, lastFontFamilyTokenIndex - i + 1);
          i -= 1;
          continue;
        } else {
          resultStr += ', ';
        }
      }
    }
  }
  return cssValue;
}

module.exports = injectSubsetDefinitions;
