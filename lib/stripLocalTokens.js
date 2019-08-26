const postcssValueParser = require('postcss-value-parser');

module.exports = function stripLocalTokens(cssValue) {
  const rootNode = postcssValueParser(cssValue);
  for (let i = 0; i < rootNode.nodes.length; i += 1) {
    const node = rootNode.nodes[i];
    if (node.type === 'function' && node.value.toLowerCase() === 'local') {
      let numTokensToRemove = 1;
      if (i + 1 < rootNode.nodes.length) {
        const nextToken = rootNode.nodes[i + 1];
        if (nextToken.type === 'div' && nextToken.value === ',') {
          numTokensToRemove += 1;
          if (i + 2 < rootNode.nodes.length) {
            rootNode.nodes[i + 2].before = node.before;
          }
        }
      }
      rootNode.nodes.splice(i, numTokensToRemove);
      i -= 1;
    }
  }
  return postcssValueParser.stringify(rootNode);
};
