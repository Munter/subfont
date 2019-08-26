const postcssValueParser = require('postcss-value-parser');

function extractReferencedCustomPropertyNames(cssValue) {
  const rootNode = postcssValueParser(cssValue);
  const customPropertyNames = new Set();
  for (const node of rootNode.nodes) {
    if (
      node.type === 'function' &&
      node.value === 'var' &&
      node.nodes.length === 1 &&
      node.nodes[0].type === 'word' &&
      /^--/.test(node.nodes[0].value)
    ) {
      customPropertyNames.add(node.nodes[0].value);
    }
  }
  return customPropertyNames;
}

module.exports = extractReferencedCustomPropertyNames;
