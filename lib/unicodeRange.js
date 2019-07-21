// A much, much smarter person than me solved this problem, and their code represents the bulk of the work here:
// http://stackoverflow.com/questions/2270910/how-to-convert-sequence-of-numbers-in-an-array-to-range-of-numbers

function getHexValue(num) {
  return num.toString(16).toUpperCase();
}

/**
 * Generates a unicode-range string from an array of unicode codepoints
 * @param  {Number[]} codePoints The code points
 * @return {String}              The resulting [unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/%40font-face/unicode-range)
 */
const getUnicodeRanges = codePoints => {
  const ranges = [];
  let start, end;

  codePoints.sort();

  for (let i = 0; i < codePoints.length; i++) {
    start = codePoints[i];
    end = start;

    while (codePoints[i + 1] - codePoints[i] === 1) {
      end = codePoints[i + 1];
      i++;
    }

    ranges.push(
      start === end
        ? `U+${getHexValue(start)}`
        : `U+${getHexValue(start)}-${getHexValue(end)}`
    );
  }

  return ranges.toString();
};

module.exports = getUnicodeRanges;
