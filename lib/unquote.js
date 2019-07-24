module.exports = function unquote(str) {
  if (typeof str !== 'string') {
    return str;
  }

  return str.replace(
    /^'([^']*)'$|^"([^"]*)"$/,
    ($0, singleQuoted, doubleQuoted) =>
      typeof singleQuoted === 'string'
        ? singleQuoted.replace(/\\'/g, "'")
        : doubleQuoted.replace(/\\"/g, '"')
  );
};
