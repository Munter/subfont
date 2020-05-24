const fs = require('fs');
const pathModule = require('path');
const expect = require('unexpected').clone();
const httpception = require('httpception');
const downloadGoogleFonts = require('../lib/downloadGoogleFonts');

const reponses = {
  'Roboto:400': `@font-face {
  font-family: 'Roboto';
  font-weight: 400;
  font-style: normal;
  src: local(foo), local(bar), url('https://fonts.gstatic.com/l/font?kit=Roboto:400') format('woff2');
}`,
};

describe('downloadGoogleFonts', () => {
  before(() => {
    httpception();
  });

  it('should download Roboto:400', async () => {
    httpception([
      {
        request: 'GET https://fonts.googleapis.com/css?family=Roboto:400',
        response: {
          headers: {
            'Content-Type': 'text/css',
          },
          body: reponses['Roboto:400'],
        },
      },

      {
        request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:400',
        response: {
          headers: {
            'Content-Type': 'font/woff2',
          },
          body: fs.readFileSync(
            pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/Roboto-500.woff2'
            )
          ),
        },
      },
    ]);

    const result = await downloadGoogleFonts(
      {
        'font-family': 'Roboto',
      },
      {
        formats: ['woff2'],
      }
    );

    expect(result.split('\n'), 'to satisfy', [
      `@font-face {`,
      `  font-family: 'Roboto';`,
      `  font-weight: 400;`,
      `  font-style: normal;`,
      `  unicode-range: U+0,U+64-7E,U+D,U+A0-FF,U+131,U+20-21,U+152-153,U+22-47,U+2C6,U+48-49,U+2DA,U+2DC,U+4A-52,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2039-203A,U+2044,U+53,U+2074,U+20AC,U+54-57,U+2212,U+58-63;`,
      `  font-display: swap;`,
      `  src: `,
      expect
        .it('to begin with', `       url('data:font/woff2;base64,`)
        .and('to end with', `') format('woff2');`),
      `}`,
    ]);
  });
});
