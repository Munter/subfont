// https://github.com/googlefonts/tools/blob/master/experimental/make_kit.py
// https://github.com/filamentgroup/glyphhanger/blob/master/index.js

// Installation:
// pip install fonttools brotli zopfli

const childProcess = require('child_process');

try {
  childProcess.execSync('pyftsubset --help');
} catch (err) {
  throw new Error(
    'Subsetting tool not available. How to install: `pip install fonttools brotli zopfli`'
  );
}

const Promise = require('bluebird');
const fs = require('fs');
const getTemporaryFilePath = require('gettemporaryfilepath');

const allowedFormats = ['woff', 'woff2'];

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const execFile = Promise.promisify(childProcess.execFile);

function subsetLocalFont(inputBuffer, format, text, ignoreMissingUnicodes) {
  if (!allowedFormats.includes(format)) {
    throw new Error(
      `Invalid output format: \`${format}\`. Allowed formats: ${allowedFormats
        .map(t => `\`${t}\``)
        .join(', ')}`
    );
  }

  text = text || '*';

  const tempInputFileName = getTemporaryFilePath({
    prefix: 'input-',
    suffix: `.${format}`
  });
  const tempOutputFileName = getTemporaryFilePath({
    prefix: 'output-',
    suffix: `.${format}`
  });

  const args = [
    tempInputFileName,
    `--output-file=${tempOutputFileName}`,
    '--obfuscate_names',
    `--flavor=${format}`,
    `--text="${text.replace('"', '\\"')}"`
  ];

  if (format === 'woff') {
    args.push('--with-zopfli');
  }

  return writeFile(tempInputFileName, inputBuffer)
    .then(result => execFile('pyftsubset', args))
    .catch(err => {
      if (
        err.message.includes(
          'fontTools.ttLib.TTLibError: Not a TrueType or OpenType font (not enough data)'
        )
      ) {
        throw new Error('Not a TrueType or OpenType font');
      }

      throw err;
    })
    .then(() => readFile(tempOutputFileName))
    .finally(() => {
      fs.unlink(tempInputFileName, () => {});
      fs.unlink(tempOutputFileName, () => {});
    });
}

module.exports = subsetLocalFont;
