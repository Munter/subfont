const fontkit = require('fontkit');

const AssetGraph = require('assetgraph');
const getGoogleIdForFontProps = require('./getGoogleIdForFontProps');
const unicodeRange = require('./unicodeRange');

const formatOrder = ['woff2', 'woff', 'truetype', 'opentype'];

/**
 * Webfont properties object containing the main differentiators for a separate font file.
 * @typedef {Object} FontProps
 * @property {string} font-family [CSS font-family](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family), unquoted
 * @property {string} font-weight [CSS font-weight](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight)
 * @property {string} font-style [CSS font-weight](https://developer.mozilla.org/en-US/docs/Web/CSS/font-style)
 */

/**
 * User agent strings by desired font format.
 * @readonly
 * @enum {string}
 */
const formatAgents = {
  eot:
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET4.0C; .NET4.0E)',
  ttf: '',
  woff:
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko',
  woff2:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; ServiceUI 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393'
};

/**
 * Download google fonts for self-hosting
 *
 * @async
 * @param  {FontProps} fontProps CSS font properties to get font for
 * @param  {Object} options
 * @param  {String[]} [options.formats=['woff2', 'woff']] List of formats that should be inclued in the output
 * @param  {String} [options.fontDisplay='swap'] CSS font-display value in returned CSS blocks
 * @param  {String} [options.text] Text to create a subset with
 * @return {String} CSS asset with inlined google fonts
 */
async function downloadGoogleFonts(
  fontProps,
  { formats = ['woff2', 'woff'], fontDisplay = 'swap', text } = {}
) {
  const sortedFormats = [];

  for (const format of formatOrder) {
    if (formats.includes(format)) {
      sortedFormats.push(format);
    }
  }

  const result = {};
  const googleFontId = getGoogleIdForFontProps(fontProps);
  let fontCssUrl = `https://fonts.googleapis.com/css?family=${googleFontId}`;

  if (text) {
    fontCssUrl += `&text=${encodeURIComponent(text)}`;
  }

  result.src = await Promise.all(
    sortedFormats.map(async format => {
      const assetGraph = new AssetGraph();
      assetGraph.teepee.headers['User-Agent'] = formatAgents[format];

      const [cssAsset] = await assetGraph.loadAssets(fontCssUrl);

      await assetGraph.populate();

      const [fontRelation] = assetGraph.findRelations({
        from: cssAsset,
        type: 'CssFontFaceSrc'
      });

      fontRelation.node.each(decl => {
        if (decl.prop !== 'src') {
          result[decl.prop] = decl.value;
        }
      });

      return [fontRelation.to, fontRelation.format];
    })
  );

  if (!('unicode-range' in result)) {
    const font = result.src[0][0];
    result['unicode-range'] = unicodeRange(
      fontkit.create(font.rawSrc).characterSet
    );
  }

  result['font-display'] = fontDisplay;

  // Output font face declaration object as CSS
  const declarationStrings = [];

  for (const [property, value] of Object.entries(result)) {
    if (property !== 'src') {
      declarationStrings.push(`  ${property}: ${value};`);
    }
  }

  const sources = result.src.map(([font, format]) => {
    return `url('${font.dataUrl}') format('${format}')`;
  });

  declarationStrings.push(`  src: \n       ${sources.join(',\n       ')};`);

  return ['@font-face {', ...declarationStrings, '}'].join('\n');
}

module.exports = downloadGoogleFonts;
