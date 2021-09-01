const specificity = require('specificity');
const postcss = require('postcss');
const unquote = require('./unquote');

const counterRendererNames = new Set([
  'none',
  'disc',
  'circle',
  'square',
  'decimal',
  'decimal-leading-zero',
  'lower-roman',
  'upper-roman',
  'lower-greek',
  'lower-latin',
  'lower-alpha',
  'upper-latin',
  'upper-alpha',
  'armenian',
  'georgian',
  'hebrew',
]);

function unwrapNamespace(str) {
  if (/^"/.test(str)) {
    return unquote(str);
  } else if (/^url\(.*\)$/i.test(str)) {
    return unquote(str.replace(/^url\((.*)\)$/, '$1'));
  } else {
    throw new Error(`Cannot parse CSS namespace: ${str}`);
  }
}

function getCssRulesByProperty(properties, cssSource, existingPredicates) {
  if (!Array.isArray(properties)) {
    throw new Error('properties argument must be an array');
  }
  if (typeof cssSource !== 'string') {
    throw new Error('cssSource argument must be a string containing valid CSS');
  }
  existingPredicates = existingPredicates || {};

  const parseTree = postcss.parse(cssSource);
  let defaultNamespaceURI;
  parseTree.walkAtRules('namespace', (rule) => {
    const fragments = rule.params.split(/\s+/);
    if (fragments.length === 1) {
      defaultNamespaceURI = unwrapNamespace(rule.params);
    }
    // FIXME: Support registering namespace prefixes (fragments.length === 2):
    // https://developer.mozilla.org/en-US/docs/Web/CSS/@namespace
  });
  const rulesByProperty = {
    counterStyles: [],
    keyframes: [],
  };

  for (const property of properties) {
    rulesByProperty[property] = [];
  }

  const activeCssQueryPredicates = [];
  function getCurrentPredicates() {
    if (activeCssQueryPredicates.length > 0) {
      const predicates = { ...existingPredicates };
      for (const predicate of activeCssQueryPredicates) {
        predicates[predicate] = true;
      }
      return predicates;
    } else {
      return existingPredicates;
    }
  }

  (function visit(node) {
    // Check for selector. We might be in an at-rule like @font-face
    if (node.type === 'decl' && node.parent.selector) {
      const isCustomProperty = /^--/.test(node.prop);
      const propName = isCustomProperty ? node.prop : node.prop.toLowerCase(); // Custom properties ARE case sensitive
      if (isCustomProperty || properties.includes(propName)) {
        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach((specificityObject) => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';
            (rulesByProperty[propName] = rulesByProperty[propName] || []).push({
              predicates: getCurrentPredicates(),
              namespaceURI: defaultNamespaceURI,
              selector: isStyleAttribute
                ? undefined
                : specificityObject.selector.trim(),
              specificityArray: isStyleAttribute
                ? [1, 0, 0, 0]
                : specificityObject.specificityArray,
              prop: propName,
              value: node.value,
              important: !!node.important,
            });
          });
      } else if (
        propName === 'list-style' &&
        properties.includes('list-style-type')
      ) {
        // Shorthand
        let listStyleType;
        node.value.replace(
          /"((?:[^"]|\\.)*")|'((?:[^']|\\.)*)'|([^'"]+)/,
          ($0, doubleQuotedString, singleQuotedString, other) => {
            if (typeof doubleQuotedString === 'string') {
              listStyleType = doubleQuotedString;
            } else if (typeof singleQuotedString === 'string') {
              listStyleType = singleQuotedString;
            } else if (other) {
              for (const otherFragment of other.trim().split(' ')) {
                if (counterRendererNames.has(otherFragment)) {
                  listStyleType = otherFragment;
                }
              }
            }
          }
        );

        if (typeof listStyleType !== 'undefined') {
          // Split up combined selectors as they might have different specificity
          specificity
            .calculate(node.parent.selector)
            .forEach((specificityObject) => {
              const isStyleAttribute =
                specificityObject.selector === 'bogusselector';

              rulesByProperty['list-style-type'].push({
                predicates: getCurrentPredicates(),
                namespaceURI: defaultNamespaceURI,
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'list-style-type',
                value: listStyleType,
                important: !!node.important,
              });
            });
        }
      } else if (
        propName === 'animation' &&
        properties.includes('animation-name')
      ) {
        // Shorthand
        const animationName = node.value.split(' ').pop();

        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach((specificityObject) => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';

            rulesByProperty['animation-name'].push({
              predicates: getCurrentPredicates(),
              namespaceURI: defaultNamespaceURI,
              selector: isStyleAttribute
                ? undefined
                : specificityObject.selector.trim(),
              specificityArray: isStyleAttribute
                ? [1, 0, 0, 0]
                : specificityObject.specificityArray,
              prop: 'animation-name',
              value: animationName,
              important: !!node.important,
            });
          });
      } else if (propName === 'transition') {
        // Shorthand
        const transitionProperties = [];
        const transitionDurations = [];
        for (const item of node.value.split(/\s*,\s*/)) {
          const itemFragments = item.split(/\s+/);
          if (itemFragments.length > 0) {
            transitionProperties.push(itemFragments[0]);
          }
          if (itemFragments.length > 1) {
            transitionDurations.push(itemFragments[1]);
          }
        }

        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach((specificityObject) => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';
            if (properties.includes('transition-property')) {
              rulesByProperty['transition-property'].push({
                predicates: getCurrentPredicates(),
                namespaceURI: defaultNamespaceURI,
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'transition-property',
                value: transitionProperties.join(', '),
                important: !!node.important,
              });
            }
            if (properties.includes('transition-duration')) {
              rulesByProperty['transition-duration'].push({
                predicates: getCurrentPredicates(),
                namespaceURI: defaultNamespaceURI,
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'transition-duration',
                value: transitionDurations.join(', '),
                important: !!node.important,
              });
            }
          });
      } else if (propName === 'font') {
        specificity
          .calculate(node.parent.selector)
          .forEach((specificityObject) => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';
            const value = {
              predicates: getCurrentPredicates(),
              namespaceURI: defaultNamespaceURI,
              selector: isStyleAttribute
                ? undefined
                : specificityObject.selector.trim(),
              specificityArray: isStyleAttribute
                ? [1, 0, 0, 0]
                : specificityObject.specificityArray,
              prop: 'font',
              value: node.value,
              important: !!node.important,
            };

            for (const prop of [
              'font-family',
              'font-weight',
              'font-size',
              'font-style',
            ]) {
              if (properties.includes(prop)) {
                rulesByProperty[prop].push(value);
              }
            }
          });
      }
    } else if (
      node.type === 'atrule' &&
      node.name.toLowerCase() === 'counter-style'
    ) {
      const props = {};
      for (const childNode of node.nodes) {
        props[childNode.prop] = childNode.value;
      }
      rulesByProperty.counterStyles.push({
        name: node.params,
        predicates: getCurrentPredicates(),
        props,
      });
    } else if (
      node.type === 'atrule' &&
      node.name.toLowerCase() === 'keyframes'
    ) {
      rulesByProperty.keyframes.push({
        name: node.params,
        namespaceURI: defaultNamespaceURI,
        predicates: getCurrentPredicates(),
        node,
      });
      return;
    }

    if (node.nodes) {
      let popAfter = false;
      if (node.type === 'atrule') {
        const name = node.name.toLowerCase();
        if (name === 'media' || name === 'supports') {
          activeCssQueryPredicates.push(`${name}Query:${node.params}`);
          popAfter = true;
        }
      }
      for (const childNode of node.nodes) {
        visit(childNode);
      }
      if (popAfter) {
        activeCssQueryPredicates.pop();
      }
    }
  })(parseTree);

  // TODO: Collapse into a single object for duplicate values?

  return rulesByProperty;
}

module.exports = getCssRulesByProperty;
