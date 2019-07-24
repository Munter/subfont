const cssFontWeightNames = require('css-font-weight-names');
const initialValueByProp = require('./initialValueByProp');
const unquote = require('./unquote');

function normalizeFontPropertyValue(propName, value) {
  const propNameLowerCase = propName.toLowerCase();
  if (value === undefined) {
    return initialValueByProp[propName];
  }
  if (propNameLowerCase === 'font-family') {
    return unquote(value);
  } else if (propNameLowerCase === 'font-weight') {
    let parsedValue = value;
    if (typeof parsedValue === 'string') {
      // FIXME: Stripping the +bolder... suffix here will not always yield the correct result
      // when expanding animations and transitions
      parsedValue = parsedValue.replace(/\+.*$/, '').toLowerCase();
    }
    parsedValue = parseFloat(cssFontWeightNames[parsedValue] || parsedValue);
    if (parsedValue >= 1 && parsedValue <= 1000) {
      return parsedValue;
    } else {
      return value;
    }
  } else if (typeof value === 'string' && propNameLowerCase !== 'src') {
    return value.toLowerCase();
  }
  return value;
}

module.exports = normalizeFontPropertyValue;
