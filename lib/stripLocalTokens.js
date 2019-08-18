const postcssValuesParser = require('postcss-values-parser');

module.exports = function stripLocalTokens(cssValue) {
  const rootNode = postcssValuesParser.parse(cssValue);

  for (let i = 0; i < rootNode.nodes.length; i += 1) {
    const node = rootNode.nodes[i];
    if (node.type === 'func' && node.name.toLowerCase() === 'local') {
      let numTokensToRemove = 1;
      if (i + 1 < rootNode.nodes.length) {
        const nextToken = rootNode.nodes[i + 1];
        if (nextToken.type === 'punctuation' && nextToken.value === ',') {
          numTokensToRemove += 1;
          if (i + 2 < rootNode.nodes.length) {
            rootNode.nodes[i + 2].raws.before = node.raws.before;
          }
        }
      }
      rootNode.nodes.splice(i, numTokensToRemove);
      i -= 1;
    }
  }
  return rootNode.toString();
};
