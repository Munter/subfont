const postcssValueParser = require('postcss-value-parser');

function injectSubsetDefinitions(cssValue, webfontNameMap, replaceOriginal) {
  const subsetFontNames = new Set(
    Object.values(webfontNameMap).map((name) => name.toLowerCase())
  );
  const rootNode = postcssValueParser(cssValue);
  let isPreceededByWords = false;
  for (const [i, node] of rootNode.nodes.entries()) {
    let possibleFontFamily;
    let lastFontFamilyTokenIndex = i;
    if (node.type === 'string') {
      possibleFontFamily = node.value;
    } else if (node.type === 'word' || node.type === 'space') {
      if (!isPreceededByWords) {
        const wordSequence = [];
        for (let j = i; j < rootNode.nodes.length; j += 1) {
          if (rootNode.nodes[j].type === 'word') {
            wordSequence.push(rootNode.nodes[j].value);
            lastFontFamilyTokenIndex = j;
          } else if (rootNode.nodes[j].type !== 'space') {
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
        const newToken = {
          type: 'string',
          value: webfontNameMap[possibleFontFamilyLowerCase].replace(
            /'/g,
            "\\'"
          ),
          quote: "'",
        };
        if (replaceOriginal) {
          rootNode.nodes.splice(
            rootNode.nodes.indexOf(node),
            lastFontFamilyTokenIndex - i + 1,
            newToken
          );
        } else {
          rootNode.nodes.splice(rootNode.nodes.indexOf(node), 0, newToken, {
            type: 'div',
            value: ',',
            after: ' ',
          });
        }
        return postcssValueParser.stringify(rootNode);
      }
    }
  }
  return cssValue;
}

module.exports = injectSubsetDefinitions;
