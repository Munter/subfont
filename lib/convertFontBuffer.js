const wawoff2 = require('wawoff2');
const woffTool = require('woff2sfnt-sfnt2woff');

const supportedFormats = new Set(['truetype', 'woff', 'woff2']);
const detectFontFormat = require('./detectFontFormat');

async function convertFontBuffer(buffer, toFormat, fromFormat) {
  if (!supportedFormats.has(toFormat)) {
    throw new Error(`Cannot convert to ${toFormat}`);
  }
  if (fromFormat) {
    if (!supportedFormats.has(fromFormat)) {
      throw new Error(`Cannot convert from ${toFormat}`);
    }
  } else {
    fromFormat = detectFontFormat(buffer);
  }

  if (fromFormat === toFormat) {
    return buffer;
  }
  if (fromFormat === 'woff') {
    buffer = woffTool.toSfnt(buffer);
  } else if (fromFormat === 'woff2') {
    buffer = Buffer.from(await wawoff2.decompress(buffer));
  }

  if (toFormat === 'woff') {
    buffer = woffTool.toWoff(buffer);
  } else if (toFormat === 'woff2') {
    buffer = Buffer.from(await wawoff2.compress(buffer));
  }
  return buffer;
}

module.exports = convertFontBuffer;
