const extractReferencedCustomPropertyNames = require('./extractReferencedCustomPropertyNames');

// Find all custom property definitions grouped by the custom properties they contribute to
function findCustomPropertyDefinitions(cssAssets) {
  const definitionsByProp = {};
  const incomingReferencesByProp = {};
  for (const cssAsset of cssAssets) {
    cssAsset.eachRuleInParseTree(cssRule => {
      if (
        cssRule.parent.type === 'rule' &&
        cssRule.type === 'decl' &&
        /^--/.test(cssRule.prop)
      ) {
        (definitionsByProp[cssRule.prop] =
          definitionsByProp[cssRule.prop] || new Set()).add(cssRule);
        for (const customPropertyName of extractReferencedCustomPropertyNames(
          cssRule.value
        )) {
          (incomingReferencesByProp[cssRule.prop] =
            incomingReferencesByProp[cssRule.prop] || new Set()).add(
            customPropertyName
          );
        }
      }
    });
  }
  const expandedDefinitionsByProp = {};
  for (const prop of Object.keys(definitionsByProp)) {
    expandedDefinitionsByProp[prop] = new Set();
    const seenProps = new Set();
    const queue = [prop];
    while (queue.length > 0) {
      const referencedProp = queue.shift();
      if (!seenProps.has(referencedProp)) {
        seenProps.add(referencedProp);
        if (definitionsByProp[referencedProp]) {
          for (const cssRule of definitionsByProp[referencedProp]) {
            expandedDefinitionsByProp[prop].add(cssRule);
          }
        }
        const incomingReferences = incomingReferencesByProp[referencedProp];
        if (incomingReferences) {
          for (const incomingReference of incomingReferences) {
            queue.push(incomingReference);
          }
        }
      }
    }
  }

  return expandedDefinitionsByProp;
}

module.exports = findCustomPropertyDefinitions;
