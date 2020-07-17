/* global WebAssembly */
const fs = require('fs');
const readFileAsync = require('util').promisify(fs.readFile);
const _ = require('lodash');
const pathModule = require('path');
const wawoff2 = require('wawoff2');
const woffTool = require('woff2sfnt-sfnt2woff');

function HB_TAG(c1, c2, c3, c4) {
  return (
    (c1.charCodeAt(0) << 24) |
    (c2.charCodeAt(0) << 16) |
    (c3.charCodeAt(0) << 8) |
    c4.charCodeAt(0)
  );
}

const loadAndInitializeHarfbuzz = _.once(async () => {
  const {
    instance: { exports },
  } = await WebAssembly.instantiate(
    await readFileAsync(
      pathModule.resolve(__dirname, '..', 'vendor', 'hb-subset.wasm')
    )
  );
  exports.memory.grow(400); // each page is 64kb in size

  const heapu8 = new Uint8Array(exports.memory.buffer);
  return [exports, heapu8];
});

module.exports = async (originalFont, targetFormat, text) => {
  const [exports, heapu8] = await loadAndInitializeHarfbuzz();

  const signature = originalFont.slice(0, 4).toString();
  if (signature === 'wOFF') {
    originalFont = woffTool.toSfnt(originalFont);
  } else if (signature === 'wOF2') {
    originalFont = await wawoff2.decompress(originalFont);
  }

  const fontBuffer = exports.malloc(originalFont.byteLength);
  heapu8.set(new Uint8Array(originalFont), fontBuffer);

  // Create the face
  const blob = exports.hb_blob_create(
    fontBuffer,
    originalFont.byteLength,
    2, // HB_MEMORY_MODE_WRITABLE
    0,
    0
  );
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  // Add glyph indices and subset
  const glyphs = exports.hb_set_create();

  for (let i = 0; i < text.length; i += 1) {
    exports.hb_set_add(glyphs, text.charCodeAt(i));
  }

  const input = exports.hb_subset_input_create_or_fail();
  const inputGlyphs = exports.hb_subset_input_unicode_set(input);
  exports.hb_set_del(
    exports.hb_subset_input_drop_tables_set(input),
    HB_TAG('G', 'S', 'U', 'B')
  );
  exports.hb_set_del(
    exports.hb_subset_input_drop_tables_set(input),
    HB_TAG('G', 'P', 'O', 'S')
  );
  exports.hb_set_del(
    exports.hb_subset_input_drop_tables_set(input),
    HB_TAG('G', 'D', 'E', 'F')
  );

  exports.hb_set_union(inputGlyphs, glyphs);
  const subset = exports.hb_subset(face, input);

  // Clean up
  exports.hb_subset_input_destroy(input);

  // Get result blob
  const result = exports.hb_face_reference_blob(subset);

  const offset = exports.hb_blob_get_data(result, 0);
  let subsetFont = heapu8.slice(
    offset,
    offset + exports.hb_blob_get_length(result)
  );

  // Clean up
  exports.hb_blob_destroy(result);
  exports.hb_face_destroy(subset);

  if (targetFormat === 'woff2') {
    subsetFont = Buffer.from(await wawoff2.compress(subsetFont));
  } else if (targetFormat === 'woff') {
    subsetFont = woffTool.toWoff(subsetFont);
  } else {
    // targetFormat === 'truetype'
    subsetFont = Buffer.from(subsetFont);
  }
  return subsetFont;
};
