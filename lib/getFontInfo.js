const fontverter = require('fontverter');

module.exports = async function getFontInfo(buffer) {
  const harfbuzzJs = await require('harfbuzzjs');

  const blob = harfbuzzJs.createBlob(await fontverter.convert(buffer, 'sfnt')); // Load the font data into something Harfbuzz can use
  const face = harfbuzzJs.createFace(blob, 0); // Select the first font in the file (there's normally only one!)

  const fontInfo = {
    characterSet: Array.from(face.collectUnicodes()),
    variationAxes: face.getAxisInfos(),
  };

  face.destroy();
  blob.destroy();

  return fontInfo;
};
