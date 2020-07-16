const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('assetgraph/test/unexpectedAssetGraph'));

const AssetGraph = require('assetgraph');
const pathModule = require('path');
const LinesAndColumns = require('lines-and-columns').default;

const proxyquire = require('proxyquire');
const httpception = require('httpception');
const sinon = require('sinon');
const fs = require('fs');
const subsetFonts = require('../lib/subsetFonts');

const fontCssUrlRegExp = /\/subfont\/fonts-[a-z0-9]{10}\.css$/;

const defaultGoogleFontSubsetMock = [
  {
    request: {
      url: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
      headers: {
        'User-Agent': expect.it('to begin with', 'AssetGraph v'),
      },
    },
    response: {
      headers: {
        'Content-Type': 'text/css',
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff) format('woff');",
        '}',
      ].join('\n'),
    },
  },
  {
    request:
      'GET https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff',
    response: {
      headers: {
        'Content-Type': 'font/woff',
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.woff'
        )
      ),
    },
  },
  {
    request:
      'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo',
    response: {
      headers: {
        'Content-Type': 'text/css',
      },
      body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8aHa0AbQ&skey=62c1cbfccc78b4b2&v=v17) format('truetype');
}
`,
    },
  },
  {
    request:
      'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8aHa0AbQ&skey=62c1cbfccc78b4b2&v=v17',
    response: {
      headers: {
        'Content-Type': 'font/ttf',
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.ttf'
        )
      ),
    },
  },
];

const defaultLocalSubsetMock = [
  {
    request: {
      url: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
      headers: {
        'User-Agent': expect.it('to begin with', 'AssetGraph v'),
      },
    },
    response: {
      headers: {
        'Content-Type': 'text/css',
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf) format('truetype');",
        '}',
      ].join('\n'),
    },
  },
  {
    request:
      'GET https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf',
    response: {
      headers: {
        'Content-Type': 'font/ttf',
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.ttf'
        )
      ),
    },
  },
];

describe('subsetFonts', function () {
  describe('without fonttools installed', function () {
    const subsetFontsWithoutFontTools = proxyquire('../lib/subsetFonts', {
      './subsetLocalFont': null,
    });

    it('should emit an info about font subsetting tool not being available', async function () {
      httpception();

      const infos = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        ),
      });
      assetGraph.on('info', function (warning) {
        infos.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(infos, 'to satisfy', [
        expect.it(
          'to have message',
          'Local subsetting is not possible because fonttools are not installed. Falling back to only subsetting Google Fonts. Run `pip install fonttools brotli zopfli` to enable local font subsetting'
        ),
        expect.it(
          'to have message',
          'Unoptimised fonts:\n - testdata/subsetFonts/local-single/OpenSans.ttf'
        ),
      ]);
    });

    it('should not break when there is an existing preload hint pointing to a font file', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/existing-preload/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph);

      expect(assetGraph, 'to contain relation', 'HtmlPreloadLink');
    });

    it('should emit an info event when detaching prefetch relations to original fonts', async function () {
      httpception();

      const infos = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/existing-prefetch/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      assetGraph.on('info', function (info) {
        infos.push(info);
      });

      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph);

      expect(assetGraph, 'to contain no relation', 'HtmlPrefetchLink');

      expect(infos, 'to satisfy', [
        {
          message:
            'Local subsetting is not possible because fonttools are not installed. Falling back to only subsetting Google Fonts. Run `pip install fonttools brotli zopfli` to enable local font subsetting',
        },
        {
          message:
            'Unoptimised fonts:\n - testdata/subsetFonts/existing-prefetch/OpenSans.ttf',
        },
        {
          message:
            'Detached <link rel="prefetch" as="font" type="application/x-font-ttf" href="OpenSans.ttf">. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/assetgraph/assetgraph/issues',
          asset: {
            type: 'Html',
          },
          relation: {
            type: 'HtmlPrefetchLink',
          },
        },
      ]);
    });

    it('should preload local fonts that it could not subset', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: '/OpenSans.ttf',
          to: {
            isLoaded: true,
          },
          as: 'font',
          contentType: 'font/ttf',
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: '/OpenSans.ttf',
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          to: {
            isLoaded: true,
            isInline: true,
            text: expect.it('to contain', 'Open Sans'),
            outgoingRelations: [
              {
                hrefType: 'relative',
                href: 'OpenSans.ttf',
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
      ]);
    });

    it('should handle HTML <link rel=stylesheet>', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
          },
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
      ]);
    });

    it('should return relevant font subsetting information', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      const result = await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(result, 'to exhaustively satisfy', {
        fontInfo: [
          {
            htmlAsset: 'testdata/subsetFonts/html-link/index.html',
            fontUsages: [
              {
                smallestOriginalSize: 17704,
                smallestOriginalFormat: 'woff',
                smallestSubsetSize: 14380,
                smallestSubsetFormat: 'woff2',
                texts: ['Hello'],
                pageText: 'Helo',
                text: 'Helo',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '400',
                  'font-style': 'normal',
                  'font-family': 'Open Sans',
                  src:
                    "local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff) format('woff')",
                },
                fontUrl:
                  'https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff',
                fontFamilies: expect.it('to be a', Set),
                codepoints: {
                  original: expect.it('to be an array'),
                  used: [32, 72, 101, 108, 111],
                  unused: expect.it('to be an array'),
                },
              },
            ],
          },
        ],
      });
    });

    describe('with `inlineCss: true`', function () {
      it('should inline the font Css and change outgoing relations to rootRelative', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          inlineCss: true,
        });

        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
            to: {
              isLoaded: true,
            },
            as: 'font',
          },
          {
            type: 'HtmlScript',
            to: {
              type: 'JavaScript',
              isInline: true,
              text: expect
                .it('to contain', "new FontFace('Open Sans__subset','url(")
                .and('to contain', '__subset'),
            },
          },
          {
            type: 'HtmlStyle',
            href: undefined,
            to: {
              isLoaded: true,
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
              outgoingRelations: [
                {
                  hrefType: 'rootRelative',
                  to: {
                    contentType: 'font/woff2',
                    extension: '.woff2',
                  },
                },

                {
                  hrefType: 'rootRelative',
                  to: {
                    contentType: 'font/woff',
                    extension: '.woff',
                  },
                },
              ],
            },
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com',
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com',
          },
          {
            type: 'HtmlStyle',
            to: {
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
            },
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
          {
            type: 'HtmlNoscript',
            to: {
              type: 'Html',
              isInline: true,
              isFragment: true,
              outgoingRelations: [
                {
                  type: 'HtmlStyle',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
        ]);
      });
    });

    it('should handle CSS @import', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/css-import/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
          },
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
      ]);
    });

    it('should add the __subset font name to the font shorthand property', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-shorthand/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });

      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(
        assetGraph.findAssets({ fileName: 'index.html' })[0].text,
        'to contain',
        "font: 12px/18px 'Open Sans__subset', 'Open Sans', Helvetica;"
      )
        .and(
          'to contain',
          ".with-weight-and-style { font: italic 700 12px/18px 'Open Sans__subset', 'Open Sans', Helvetica; }"
        )
        .and(
          'to contain',
          ".with-style-and-weight { font: italic 700 12px/18px 'Open Sans__subset', 'Open Sans', Helvetica; }"
        )
        .and(
          'to contain',
          ".with-weight { font: 700 12px/18px 'Open Sans__subset', 'Open Sans', Helvetica; }"
        );
    });

    it('should add the __subset font name to a custom property that contributes to the font-family property', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-shorthand-with-custom-property/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      const [htmlAsset] = await assetGraph.loadAssets('index.html');

      // Remove annoying trailing \n inserted by jsdom that breaks the test because it makes us ask GWF to include space in the subset
      htmlAsset.parseTree.body.lastChild.nodeValue = '';

      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });

      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(
        assetGraph.findAssets({ fileName: 'index.html' })[0].text,
        'to contain',
        "--unrelated-property: 'Open Sans', Helvetica;"
      )
        .and(
          'to contain',
          "--the-font: 'Open Sans__subset', 'Open Sans', Helvetica;"
        )
        .and(
          'to contain',
          "--the-font-family: 'Open Sans__subset', 'Open Sans', Helvetica;"
        )
        .and('to contain', 'foNT: 12px/18px var(--the-font)')
        .and('to contain', '--fallback-font: sans-serif')
        .and(
          'to contain',
          "foNT: 12px 'Open Sans__subset', 'Open Sans', var(--fallback-font);"
        )
        .and(
          'to contain',
          "font-FAMILY: 'Open Sans__subset', 'Open Sans', var(--fallback-font);"
        );
    });

    it('should not break if there is an existing reference to a Google Web Font CSS inside a script', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/google-webfont-ref-in-javascript/'
        ),
      });
      assetGraph.on('warn', console.log);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        inlineFonts: false,
        inlineCss: true,
      });
    });

    describe('with `inlineFonts: true`', function () {
      it('should inline the font subset', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/inline-subsets/'
          ),
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });

        await subsetFonts(assetGraph, {
          inlineFonts: true,
        });
        const css = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];

        expect(css.outgoingRelations, 'to satisfy', [
          {
            type: 'CssFontFaceSrc',
            hrefType: `inline`,
            href: /^data:font\/woff2;base64/,
            to: {
              isInline: true,
              contentType: `font/woff2`,
            },
          },
          {
            type: 'CssFontFaceSrc',
            hrefType: `inline`,
            href: /^data:font\/woff;base64/,
            to: {
              isInline: true,
              contentType: `font/woff`,
            },
          },
        ]);
        // Regression test for https://github.com/Munter/subfont/pull/73
        expect(htmlAsset.text, 'not to contain', '<script>try{new FontFace');
      });
    });

    // Regression tests for https://github.com/Munter/subfont/issues/24
    describe('when the same Google Web Font is referenced multiple times', function () {
      it('should not break for two identical CSS @imports from the same asset', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/css-import-twice/'
          ),
        });

        await assetGraph.loadAssets('index.html').populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
        });

        expect(assetGraph, 'to contain relation', 'CssImport');
        expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
      });

      it('should not break for two CSS @imports in different stylesheets', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/css-import-twice-different-css/'
          ),
        });

        await assetGraph.loadAssets('index.html').populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
        });

        expect(assetGraph, 'to contain relation', 'CssImport');
        expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
      });
    });

    it('should handle multiple font-families', async function () {
      httpception([
        {
          request: {
            url:
              'GET https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
            headers: {
              'User-Agent': expect.it('to begin with', 'AssetGraph v'),
            },
          },
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Jim Nightshade';
  font-style: normal;
  font-weight: 400;
  src: local('Jim Nightshade'), local('JimNightshade-Regular'), url(https://fonts.gstatic.com/s/jimnightshade/v7/PlIkFlu9Pb08Q8HLM1PxmB0g-NS_XX4.ttf) format('truetype');
}
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 400;
  src: local('Montserrat Regular'), local('Montserrat-Regular'), url(https://fonts.gstatic.com/s/montserrat/v14/JTUSjIg1_i6t8kCHKm459Wlhzg.ttf) format('truetype');
}
@font-face {
  font-family: 'Space Mono';
  font-style: normal;
  font-weight: 400;
  src: local('Space Mono'), local('SpaceMono-Regular'), url(https://fonts.gstatic.com/s/spacemono/v5/i7dPIFZifjKcF5UAWdDRYEF8QA.ttf) format('truetype');
}
`,
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/s/jimnightshade/v7/PlIkFlu9Pb08Q8HLM1PxmB0g-NS_XX4.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/JimNightshade-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/s/montserrat/v14/JTUSjIg1_i6t8kCHKm459Wlhzg.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Montserrat-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/s/spacemono/v5/i7dPIFZifjKcF5UAWdDRYEF8QA.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/SpaceMono-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Jim Nightshade';
  font-style: normal;
  font-weight: 400;
  src: local('Jim Nightshade'), local('JimNightshade-Regular'), url(https://fonts.gstatic.com/l/font?kit=PlIkFlu9Pb08Q8HLM1PxmB0g-OS4T3rKDLgt&skey=a1cdb4741ac7b833&v=v7) format('truetype');
}
`,
          },
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 400;
  src: local('Montserrat Regular'), local('Montserrat-Regular'), url(https://fonts.gstatic.com/l/font?kit=JTUSjIg1_i6t8kCHKm45xW5zykqCkKQ&skey=7bc19f711c0de8f&v=v14) format('truetype');
}
`,
          },
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Space Mono';
  font-style: normal;
  font-weight: 400;
  src: local('Space Mono'), local('SpaceMono-Regular'), url(https://fonts.gstatic.com/l/font?kit=i7dPIFZifjKcF5UAWdDRUEZuRRHfd3bh&skey=5e801b58db657470&v=v5) format('truetype');
}
`,
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=PlIkFlu9Pb08Q8HLM1PxmB0g-OS4T3rKDLgt&skey=a1cdb4741ac7b833&v=v7',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Montserrat-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=JTUSjIg1_i6t8kCHKm45xW5zykqCkKQ&skey=7bc19f711c0de8f&v=v14',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/SpaceMono-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=i7dPIFZifjKcF5UAWdDRUEZuRRHfd3bh&skey=5e801b58db657470&v=v5',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/JimNightshade-400.ttf'
              )
            ),
          },
        },
      ]);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multi-family/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });
      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Jim_Nightshade-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Montserrat-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Space_Mono-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Jim Nightshade__subset')
              .and('to contain', 'Montserrat__subset')
              .and('to contain', 'Space Mono__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Jim_Nightshade-400-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Montserrat-400-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Space_Mono-400-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect
              .it('to contain', 'Jim Nightshade__subset')
              .and('to contain', 'Montserrat__subset')
              .and('to contain', 'Space Mono__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Jim Nightshade__subset')
              .and('to contain', 'Montserrat__subset')
              .and('to contain', 'Space Mono__subset'),
          },
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href:
                  'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href:
                  'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
              },
            ],
          },
        },
      ]);
    });

    it('should handle multiple font-weights and font-style', async function () {
      httpception([
        {
          request: {
            url:
              'GET https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
            headers: {
              'User-Agent': expect.it('to begin with', 'AssetGraph v'),
            },
          },
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-weight: 300;
  src: local('Roboto Light Italic'), local('Roboto-LightItalic'), url(https://fonts.gstatic.com/s/roboto/v20/KFOjCnqEu92Fr1Mu51TjASc6CsE.ttf) format('truetype');
}
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: local('Roboto'), local('Roboto-Regular'), url(https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf) format('truetype');
}
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 500;
  src: local('Roboto Medium'), local('Roboto-Medium'), url(https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmEU9fBBc9.ttf) format('truetype');
}
`,
          },
        },

        {
          request:
            'GET https://fonts.gstatic.com/s/roboto/v20/KFOjCnqEu92Fr1Mu51TjASc6CsE.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-300i.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-400.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmEU9fBBc9.ttf',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-500.ttf'
              )
            ),
          },
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 500;
  src: local('Roboto Medium'), local('Roboto-Medium'), url(https://fonts.gstatic.com/l/font?kit=KFOlCnqEu92Fr1MmEU9vAwU5YqSe-g&skey=ee881451c540fdec&v=v20) format('truetype');
}
`,
          },
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: local('Roboto'), local('Roboto-Regular'), url(https://fonts.gstatic.com/l/font?kit=KFOmCnqEu92Fr1Me5X5LR1ZWWA&skey=a0a0114a1dcab3ac&v=v20) format('truetype');
}
`,
          },
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru',
          response: {
            headers: {
              'Content-Type': 'text/css',
            },
            body: `@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-weight: 300;
  src: local('Roboto Light Italic'), local('Roboto-LightItalic'), url(https://fonts.gstatic.com/l/font?kit=KFOjCnqEu92Fr1Mu51TjARc9GMSx8OQ8Dg&skey=8f644060176e1f7e&v=v20) format('truetype');
}
`,
          },
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=KFOlCnqEu92Fr1MmEU9vAwU5YqSe-g&skey=ee881451c540fdec&v=v20',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-500.ttf'
              )
            ),
          },
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=KFOmCnqEu92Fr1Me5X5LR1ZWWA&skey=a0a0114a1dcab3ac&v=v20',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-400.ttf'
              )
            ),
          },
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=KFOjCnqEu92Fr1Mu51TjARc9GMSx8OQ8Dg&skey=8f644060176e1f7e&v=v20',
          response: {
            headers: {
              'Content-Type': 'font/ttf',
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-300.ttf'
              )
            ),
          },
        },
      ]);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multi-weight/'
        ),
      });
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Roboto-500-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Roboto-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Roboto-300i-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Roboto__subset')
              .and('to contain', "'font-weight':500")
              .and('to contain', "'font-style':'italic','font-weight':300"),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Roboto-500-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Roboto-400-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: /^\/subfont\/Roboto-300i-[a-f0-9]{10}\.woff2$/,
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect.it('to contain', 'Roboto__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Roboto__subset'),
          },
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href:
                  'https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href:
                  'https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
              },
            ],
          },
        },
      ]);
    });

    describe('when running on multiple pages with subsetPerPage:true', function () {
      it('should have an individual subset for each page', async function () {
        httpception([
          {
            request: {
              url: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
              headers: {
                'User-Agent': expect.it('to begin with', 'AssetGraph v'),
              },
            },
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf) format('truetype');
}
`,
            },
          },

          {
            request:
              'GET https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.ttf'
                )
              ),
            },
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abotu',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8YdakObdLu&skey=62c1cbfccc78b4b2&v=v17) format('truetype');
}
`,
            },
          },
          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20ehmo',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8bda0Eb8k&skey=62c1cbfccc78b4b2&v=v17) format('truetype');
}
`,
            },
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8YdakObdLu&skey=62c1cbfccc78b4b2&v=v17',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: Buffer.from(
                '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',
                'base64'
              ),
            },
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8bda0Eb8k&skey=62c1cbfccc78b4b2&v=v17',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: Buffer.from(
                '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',
                'base64'
              ),
            },
          },
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          // FIXME: The mocked out woff and woff2 fonts from Google don't contain space.
          // Redo the mocks so we don't have to allow 'Missing glyph' here:
          expect(warn, 'to satisfy', /Missing glyph|Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          subsetPerPage: true,
        });

        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
        expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
        const about = assetGraph.findAssets({ fileName: 'about.html' })[0];

        // Subsets
        expect(
          assetGraph.findRelations({
            type: 'HtmlStyle',
            crossorigin: false,
            to: { isInline: false },
          }),
          'to satisfy',
          [
            {
              type: 'HtmlStyle',
              from: index,
              to: {
                type: 'Css',
                url: fontCssUrlRegExp,
                isLoaded: true,
                isInline: false,
                outgoingRelations: [
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: /^Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                      isLoaded: true,
                      isInline: false,
                    },
                  },
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: /^Open_Sans-400-[a-f0-9]{10}\.woff$/,
                      isLoaded: true,
                      isInline: false,
                    },
                  },
                ],
              },
            },
            {
              type: 'HtmlStyle',
              from: about,
              to: {
                type: 'Css',
                url: fontCssUrlRegExp,
                isLoaded: true,
                isInline: false,
                outgoingRelations: [
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: /^Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                      isLoaded: true,
                      isInline: false,
                    },
                  },
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: /^Open_Sans-400-[a-f0-9]{10}\.woff$/,
                      isLoaded: true,
                      isInline: false,
                    },
                  },
                ],
              },
            },
          ]
        );

        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
            to: {
              isLoaded: true,
            },
            as: 'font',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2',
                  },
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff',
                  },
                },
              ],
            },
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: {
              isLoaded: true,
            },
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com',
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com',
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true },
          },
          {
            type: 'HtmlAnchor',
            href: 'about.html',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
          {
            type: 'HtmlNoscript',
            to: {
              type: 'Html',
              isInline: true,
              isFragment: true,
              outgoingRelations: [
                {
                  type: 'HtmlStyle',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
        ]);

        const indexFontStyle = index.outgoingRelations[1].to;
        const indexFont = index.outgoingRelations[0].to;

        expect(about.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
            to: expect.it('not to be', indexFont),
            as: 'font',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2',
                  },
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff',
                  },
                },
              ],
            },
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: expect.it('not to be', indexFontStyle),
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com',
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com',
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true },
          },
          {
            type: 'HtmlAnchor',
            href: 'index.html',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
          {
            type: 'HtmlNoscript',
            to: {
              type: 'Html',
              isInline: true,
              isFragment: true,
              outgoingRelations: [
                {
                  type: 'HtmlStyle',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
        ]);
      });
    });

    describe('when running on multiple pages with subsetPerPage:false', function () {
      it('should share a common subset across pages', async function () {
        httpception([
          {
            request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf) format('truetype');
}
`,
            },
          },

          {
            request:
              'GET https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.ttf'
                )
              ),
            },
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abehmotu',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8XdakOZ8724N-i&skey=62c1cbfccc78b4b2&v=v17) format('truetype');
}
`,
            },
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8XdakOZ8724N-i&skey=62c1cbfccc78b4b2&v=v17',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: Buffer.from(
                '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',
                'base64'
              ),
            },
          },
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          // FIXME: The mocked out woff and woff2 fonts from Google don't contain space.
          // Redo the mocks so we don't have to allow 'Missing glyph' here:
          expect(warn, 'to satisfy', /Missing glyph|Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          subsetPerPage: false,
        });

        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
        expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
        const about = assetGraph.findAssets({ fileName: 'about.html' })[0];

        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
            to: {
              isLoaded: true,
            },
            as: 'font',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2',
                  },
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff',
                  },
                },
              ],
            },
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: {
              isLoaded: true,
            },
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com',
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com',
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true },
          },
          {
            type: 'HtmlAnchor',
            href: 'about.html',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
          {
            type: 'HtmlNoscript',
            to: {
              type: 'Html',
              isInline: true,
              isFragment: true,
              outgoingRelations: [
                {
                  type: 'HtmlStyle',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
        ]);

        const sharedFontStyles = index.outgoingRelations[2].to;
        const sharedFont = index.outgoingRelations[0].to;

        expect(about.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
            to: sharedFont,
            as: 'font',
          },
          {
            type: 'HtmlScript',
            to: {
              type: 'JavaScript',
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset'),
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  href: /^\/subfont\/Open_Sans-400-[a-f0-9]{10}\.woff2$/,
                  to: sharedFont,
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff',
                  },
                },
              ],
            },
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: sharedFontStyles,
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com',
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com',
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true },
          },
          {
            type: 'HtmlAnchor',
            href: 'index.html',
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
          {
            type: 'HtmlNoscript',
            to: {
              type: 'Html',
              isInline: true,
              isFragment: true,
              outgoingRelations: [
                {
                  type: 'HtmlStyle',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                },
              ],
            },
          },
        ]);
      });
    });

    describe('fontDisplay option', function () {
      it('should not add a font-display property when no fontDisplay is defined', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
        });

        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];

        expect(cssAsset.text, 'not to contain', 'font-display');
      });

      it('should not add a font-display property when an invalid font-display value is provided', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          fontDisplay: 'foo',
        });

        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];

        expect(cssAsset.text, 'not to contain', 'font-display');
      });

      it('should add a font-display property', async function () {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          fontDisplay: 'block',
        });

        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];

        expect(cssAsset.text, 'to contain', '@font-face{font-display:block');
      });

      it('should update an existing font-display property', async function () {
        httpception([
          {
            request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf) format('truetype');
}
`,
            },
          },

          {
            request:
              'GET https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.ttf'
                )
              ),
            },
          },
          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo',
            response: {
              headers: {
                'Content-Type': 'text/css',
              },
              body: `@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8aHa0AbQ&skey=62c1cbfccc78b4b2&v=v17) format('truetype');
}
`,
            },
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1Uo8aHa0AbQ&skey=62c1cbfccc78b4b2&v=v17',
            response: {
              headers: {
                'Content-Type': 'font/ttf',
              },
              body: Buffer.from(
                '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',
                'base64'
              ),
            },
          },
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          ),
        });
        assetGraph.on('warn', (warn) =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFontsWithoutFontTools(assetGraph, {
          inlineFonts: false,
          fontDisplay: 'fallback',
        });

        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];
        expect(cssAsset.text, 'to contain', 'font-display:fallback;');
      });
    });

    // Regression test for https://github.com/Munter/subfont/issues/74
    it('should work with omitFallbacks:true and Google Web Fonts', async function () {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        ),
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFontsWithoutFontTools(assetGraph, {
        inlineCss: true,
        omitFallbacks: true,
      });
      expect(
        htmlAsset.text,
        'not to contain',
        '<link href="https://fonts.googleapis.com'
      );
    });
  });

  describe('with fonttools installed', function () {
    it('should emit no warning about font subsetting tool not being available', async function () {
      httpception();

      const warnings = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        ),
      });
      assetGraph.on('warn', function (warning) {
        warnings.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(warnings, 'to satisfy', []);
    });

    it('should error out on multiple @font-face declarations with the same family/weight/style/stretch', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/woff2-original/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await expect(
        subsetFonts(assetGraph),
        'to be rejected with',
        'Multiple @font-face with the same font-family/font-style/font-weight (maybe with different unicode-range?) is not supported yet: Roboto Slab/normal/300'
      );
    });

    it('should emit a warning when subsetting invalid fonts', async function () {
      httpception();

      const warnings = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-invalid/'
        ),
      });
      assetGraph.on('warn', function (warning) {
        warnings.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph, {
        inlineCss: true,
      });
      expect(warnings, 'to satisfy', [
        expect
          .it('to be an', Error)
          .and('to have message', 'Not a TrueType or OpenType font')
          .and('to satisfy', {
            asset: expect.it('to be an', 'AssetGraph.asset'),
          }),
        expect
          .it('to be an', Error)
          .and('to have message', 'Not a TrueType or OpenType font')
          .and('to satisfy', {
            asset: expect.it('to be an', 'AssetGraph.asset'),
          }),
      ]);

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: '/OpenSans.ttf',
          to: {
            isLoaded: true,
          },
          as: 'font',
          contentType: 'font/ttf',
        },
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: '/OpenSans.ttf',
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          to: {
            isLoaded: true,
            isInline: true,
            text: expect.it('to contain', 'Open Sans'),
            outgoingRelations: [
              {
                hrefType: 'relative',
                href: 'OpenSans.ttf',
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
      ]);
    });

    describe('when the highest prioritized font-family is missing glyphs', function () {
      it('should emit an info event', async function () {
        httpception();

        const infoSpy = sinon.spy().named('warn');
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/missing-glyphs/'
          ),
        });
        assetGraph.on('info', infoSpy);
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });

        expect(infoSpy, 'to have calls satisfying', function () {
          infoSpy({
            message: expect
              .it('to contain', 'Missing glyph fallback detected')
              .and('to contain', '\\u{4e2d} (中)')
              .and('to contain', '\\u{56fd} (国)'),
          });
        });
      });

      describe('when the original @font-face declaration does not contain a unicode-range property', function () {
        it('should add a unicode-range property', async function () {
          httpception();

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/missing-glyphs/'
            ),
          });
          assetGraph.on('warn', () => {}); // Don't fail due to the missing glyphs warning
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          await subsetFonts(assetGraph, {
            inlineFonts: false,
          });

          const [originalFontFaceSrcRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'OpenSans.ttf' },
          });
          expect(
            originalFontFaceSrcRelation.from.text,
            'to contain',
            'unicode-range:U+20-7e,U+a0-ff,'
          );
        });
      });

      describe('when one out of multiple variants of a font-family has missing glyphs', function () {
        it('should add a unicode-range property to all of the @font-face declarations of the font-familys', async function () {
          httpception();

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/missing-glyphs-multiple-variants/'
            ),
          });
          assetGraph.on('warn', () => {}); // Don't fail due to the missing glyphs warning

          await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          await subsetFonts(assetGraph, {
            inlineFonts: false,
          });

          const [outputSansRegularRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'OutputSans-Regular.woff2' },
          });
          expect(
            outputSansRegularRelation.node.toString(),
            'not to contain',
            'unicode-range:'
          );
          const [outputSansBoldRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'OutputSans-Bold.woff2' },
          });
          expect(
            outputSansBoldRelation.node.toString(),
            'not to contain',
            'unicode-range:'
          );

          const [inputMonoRegularRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'InputMono-Regular.woff2' },
          });
          expect(
            inputMonoRegularRelation.node.toString(),
            'to contain',
            'unicode-range:U+'
          );
          const [inputMonoBoldRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'InputMono-Medium.woff2' },
          });
          expect(
            inputMonoBoldRelation.node.toString(),
            'to contain',
            'unicode-range:U+'
          );
        });
      });

      describe('when the original @font-face declaration already contains a unicode-range property', function () {
        it('should leave the existing unicode-range alone', async function () {
          httpception();

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/missing-glyphs-unicode-range/'
            ),
          });
          assetGraph.on('warn', () => {}); // Don't fail due to the missing glyphs warning
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          await subsetFonts(assetGraph, {
            inlineFonts: false,
          });

          const [originalFontFaceSrcRelation] = assetGraph.findRelations({
            type: 'CssFontFaceSrc',
            to: { fileName: 'OpenSans.ttf' },
          });
          expect(
            originalFontFaceSrcRelation.from.text,
            'to contain',
            'unicode-range:foobar'
          ).and('not to contain', 'unicode-range:U+64-7e,U+a0-ff,');
        });
      });

      it('should check for missing glyphs in any subset format', async function () {
        httpception();

        const infoSpy = sinon.spy().named('info');
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/missing-glyphs/'
          ),
        });
        assetGraph.on('info', infoSpy);
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFonts(assetGraph, {
          inlineFonts: false,
          formats: [`woff2`],
        });

        expect(infoSpy, 'to have calls satisfying', function () {
          infoSpy({
            message: expect
              .it('to contain', 'Missing glyph fallback detected')
              .and('to contain', '\\u{4e2d} (中)')
              .and('to contain', '\\u{56fd} (国)'),
          });
        });
      });

      // Some fonts don't contain these, but browsers don't seem to mind, so the messages would just be noise
      it('should not warn about tab and newline missing from the font being subset', async function () {
        httpception();

        const infoSpy = sinon.spy().named('info');
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/missing-tab-and-newline-glyphs/'
          ),
        });
        assetGraph.on('warn', infoSpy);
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });

        expect(infoSpy, 'was not called');
      });
    });

    it('should subset local fonts', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.woff2'),
          to: {
            isLoaded: true,
          },
          as: 'font',
          contentType: 'font/woff2',
        },
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },

        {
          type: 'HtmlStyle',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.css'),
          to: {
            isLoaded: true,
            isInline: false,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                },
              },
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          to: {
            isLoaded: true,
            isInline: true,
          },
        },
        // Fallback loaders:
        {
          type: 'HtmlScript',
          hrefType: 'inline',
          to: { outgoingRelations: [{ type: 'JavaScriptStaticUrl' }] },
        },
        { type: 'HtmlNoscript', hrefType: 'inline' },
      ]);
    });

    it('should add a script that async loads a CSS with the original @font-face declarations right before </body>', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        ),
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });
      const originalInlineStylesheet = assetGraph.findAssets({
        type: 'Css',
        isInline: true,
      })[0];
      // Check that the original @font-face was removed from the inline stylesheet:
      expect(originalInlineStylesheet.text, 'not to contain', '@font-face');
      const fallbackCss = assetGraph.findAssets({
        fileName: { $regex: /^fallback-.*\.css/ },
      })[0];
      expect(
        htmlAsset.text,
        'to contain',
        `<script>(function(){var el=document.createElement('link');el.href='/subfont/${fallbackCss.fileName}'.toString('url');el.rel='stylesheet';document.body.appendChild(el)}())</script><noscript><link rel="stylesheet" href="/subfont/${fallbackCss.fileName}"></noscript></body></html>`
      );
      expect(
        fallbackCss.text,
        'to equal',
        '@font-face{font-family:Open Sans;font-style:normal;font-weight:400;src:local("Open Sans Regular"),local("OpenSans-Regular"),url(/OpenSans.ttf) format("truetype")}'
      );
      const originalFontFaceLoadingScript = assetGraph.findAssets({
        type: 'JavaScript',
        isInline: true,
        text: { $regex: /createElement/ },
      })[0];
      expect(
        originalFontFaceLoadingScript.text,
        'to contain',
        `el.href='/subfont/${fallbackCss.fileName}'`
      );
      expect(assetGraph, 'to contain relation', {
        from: originalFontFaceLoadingScript,
        to: { type: 'Css' },
      });
    });

    describe('when the stylesheet containing the original @font-face declarations did not contain anything else', function () {
      it('should be removed', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/local-with-no-css-rules-in-font-face-stylesheet/'
          ),
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        expect(htmlAsset.text, 'not to contain', '<style>');
      });
    });

    describe('with unused variants', function () {
      it('should provide a @font-face declaration for the __subset version of an unused variant', async function () {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await subsetFonts(assetGraph, {
          inlineFonts: false,
          inlineCss: true,
        });
        const subfontCss = assetGraph.findAssets({
          type: 'Css',
          isInline: true,
          text: { $regex: /KFOjCnqEu92Fr1Mu51TzBic6CsI/ },
        })[0];

        expect(
          subfontCss.text,
          'to contain',
          "font-family:Roboto__subset;font-stretch:normal;font-style:italic;font-weight:700;src:url(/KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format('woff')"
        );
        expect(assetGraph, 'to contain relation', {
          from: subfontCss,
          to: {
            url: `${assetGraph.root}KFOjCnqEu92Fr1Mu51TzBic6CsI.woff`,
          },
        });
      });

      describe('with inlineCss:false', function () {
        it('should put the @font-face declarations for the unused variants in the main subfont CSS rather than a separate one after the JS preload script', async function () {
          httpception();

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/unused-variant/'
            ),
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate();
          await subsetFonts(assetGraph, {
            inlineFonts: false,
            inlineCss: false,
          });
          const subfontCss = assetGraph.findAssets({
            type: 'Css',
            path: '/subfont/',
          })[0];

          expect(
            subfontCss.text,
            'to contain',
            'font-family:Roboto__subset;font-stretch:normal;font-style:italic;font-weight:700;src:url(/KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format("woff")'
          );
          expect(assetGraph, 'to contain relation', {
            from: subfontCss,
            to: {
              url: `${assetGraph.root}KFOjCnqEu92Fr1Mu51TzBic6CsI.woff`,
            },
          });

          // Make sure that the extra stylesheet doesn't get generated in inlineCss:false mode:
          expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
        });
      });

      it('should not provide a @font-face declaration for the __subset version of an unused variant that did not get any subsets created', async function () {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-font/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });

        const subfontCss = assetGraph.findAssets({
          type: 'Css',
          path: '/subfont/',
        })[0];

        expect(subfontCss.text, 'not to contain', 'unused__subset');
        expect(assetGraph, 'to contain no relation', {
          from: subfontCss,
          to: {
            url: `${assetGraph.root}subfont/Roboto-700i-846d1890ae.woff`,
          },
        });
      });

      it('should not move any of the original fonts to /subfont/', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant-on-one-page/'
          ),
        });
        await assetGraph.loadAssets('index*.html');
        await assetGraph.populate();
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });

        expect(assetGraph, 'to contain asset', {
          url: `${assetGraph.root}IBMPlexSans-Regular.woff`,
        }).and('to contain asset', {
          url: `${assetGraph.root}IBMPlexSans-Italic.woff`,
        });
      });

      it('should not preload the unused variants', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant-preload/'
          ),
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        const [preloadPolyfill] = assetGraph.findAssets({
          type: 'JavaScript',
          text: { $regex: /new FontFace/ },
        });
        expect(preloadPolyfill.text, 'to contain', ".woff2'")
          .and('to contain', 'Input_Mono-400')
          .and('not to contain', 'Input_Mono-700');
        const preloadLinks = assetGraph.findRelations({
          from: htmlAsset,
          type: 'HtmlPreloadLink',
        });
        expect(preloadLinks, 'to satisfy', [
          { href: /^\/subfont\/Input_Mono-400-[a-f0-9]{10}\.woff2$/ },
        ]);
      });

      describe('with Google Web Fonts', function () {
        it('should not preload the unused variants', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/unused-variant-preload-google/'
            ),
          });
          const [htmlAsset] = await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          await subsetFonts(assetGraph, {
            inlineFonts: false,
          });
          const [preloadPolyfill] = assetGraph.findAssets({
            type: 'JavaScript',
            text: { $regex: /new FontFace/ },
          });
          expect(preloadPolyfill.text, 'to contain', ".woff2'")
            .and('to contain', ".woff'")
            .and('not to contain', ".ttf'")
            .and('not to contain', 'fonts.gstatic.com');
          const preloadLinks = assetGraph.findRelations({
            from: htmlAsset,
            type: 'HtmlPreloadLink',
          });
          expect(preloadLinks, 'to satisfy', [
            { href: /^\/subfont\/Noto_Serif-400-[a-f0-9]{10}\.woff2$/ },
          ]);
        });
      });
    });

    it('should return a fontInfo object with defaulted/normalized props', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-face-defaults-and-casing/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Hello, world!'],
              props: {
                'font-family': 'Foo',
                'font-style': 'normal',
                'font-weight': 'boLD',
                'font-stretch': 'conDENSED',
                src: "url(OpenSans.ttf) format('truetype')",
              },
            },
            {
              texts: ['Hello, yourself!'],
              props: {
                'font-family': 'BAR',
                'font-style': 'ITAlic',
                'font-weight': 'normal',
                'font-stretch': 'normal',
                src: "url(OpenSans2.ttf) format('truetype')",
              },
            },
          ],
        },
      ]);
    });

    it('should support multiple @font-face blocks with different font-family, but same src', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multiple-font-face-with-same-src/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Hello, world!', 'Hello, yourself!'],
              props: { 'font-family': 'foo' },
            },
          ],
        },
      ]);

      const htmlAsset = assetGraph.findAssets({
        type: 'Html',
      })[0];

      expect(
        htmlAsset.text,
        'to contain',
        "font-family: foo__subset, 'foo'"
      ).and(
        'to contain',
        '<p style="font-family: foo__subset, bar">Hello, yourself!</p>'
      );
    });

    it('should tolerate case differences in font-family', async function () {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-font-family-case-difference/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Hello, world!', 'Hello, yourself!'],
              props: { 'font-family': 'Open Sans' },
            },
          ],
        },
      ]);
      expect(
        assetGraph.findAssets({ type: 'Css' })[0].text,
        'to contain',
        "font-family: 'Open Sans__subset', oPeN sAnS;"
      ).and('to contain', "--the-font: 'Open Sans__subset', OpEn SaNs;");
    });

    it('should handle HTML <link rel=stylesheet> with Google Fonts', async function () {
      httpception(defaultLocalSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        ),
      });
      // FIXME: Maybe use a font that's not missing any chars?
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /is missing these characters/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
          },
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
      ]);
    });

    it('should assume font-weight:normal and font-style:normal when not explicitly mentioned in the @font-face block', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-weight-and-style-omitted/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await subsetFonts(assetGraph, {
        inlineFonts: false,
      });
      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              text: 'fo',
              props: {
                'font-stretch': 'normal',
                'font-weight': 'normal',
                'font-style': 'normal',
                'font-family': 'Open Sans',
              },
            },
          ],
        },
      ]);
    });

    describe('when multiple pages contain the same subsets', function () {
      // https://github.com/Munter/subfont/issues/50
      it('should link to and preload the same subset files rather than creating two copies', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page-same-subset/'
          ),
        });
        const [htmlAsset1, htmlAsset2] = await assetGraph.loadAssets(
          'index*.html'
        );
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        const preloads1 = htmlAsset1.outgoingRelations.filter(
          (relation) => relation.type === 'HtmlPreloadLink'
        );
        const preloads2 = htmlAsset2.outgoingRelations.filter(
          (relation) => relation.type === 'HtmlPreloadLink'
        );
        expect(preloads1, 'to have length', 1);
        expect(preloads2, 'to have length', 1);
        expect(preloads1[0].to, 'to be', preloads2[0].to);

        const regularSubsetFonts = assetGraph.findAssets({
          fileName: { $regex: /^IBM_Plex_Sans-400-/ },
          extension: '.woff2',
        });
        // Assert the absence of a -1.woff duplicate:
        expect(regularSubsetFonts, 'to have length', 1);

        expect(htmlAsset1.text, 'to equal', htmlAsset2.text);
      });
    });

    it('should handle mixed local fonts and Google fonts', async function () {
      httpception(defaultLocalSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-mixed/'
        ),
      });
      // FIXME: Maybe use a font that's not missing any chars?
      assetGraph.on('warn', (warn) =>
        expect(warn, 'to satisfy', /is missing these characters/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Local_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
          },
          as: 'font',
        },
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Local_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Local_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true,
            text: expect
              .it('to contain', 'Open Sans__subset')
              .and('to contain', 'Local Sans__subset'),
            outgoingRelations: [
              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  fileName: expect.it('to begin with', 'Local_Sans-400-'),
                  extension: '.woff2',
                },
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  fileName: expect.it('to begin with', 'Local_Sans-400-'),
                  extension: '.woff',
                },
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  fileName: expect.it('to begin with', 'Open_Sans-400-'),
                  extension: '.woff2',
                },
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  fileName: expect.it('to begin with', 'Open_Sans-400-'),
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com',
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com',
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Open Sans__subset')
              .and('to contain', 'Local Sans__subset'),
          },
        },
        // Self-hosted fallback loaders:
        {
          type: 'HtmlScript',
          hrefType: 'inline',
          to: { outgoingRelations: [{ type: 'JavaScriptStaticUrl' }] },
        },
        { type: 'HtmlNoscript', hrefType: 'inline' },
        // Google fallback loaders:
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          to: {
            type: 'Html',
            isInline: true,
            isFragment: true,
            outgoingRelations: [
              {
                type: 'HtmlStyle',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
              },
            ],
          },
        },
      ]);
    });

    describe('with a variable font defined in a @supports block and a non-variable fallback', function () {
      it('should subset both the variable font and the fallback font', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-in-supports-block-with-fallback/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        expect(fontInfo, 'to satisfy', [
          {
            fontUsages: [
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': 'normal',
                  'font-style': 'normal',
                  'font-family': 'Venn VF',
                },
              },
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': 'normal',
                  'font-style': 'normal',
                  'font-family': 'Venn',
                },
              },
            ],
          },
        ]);

        expect(
          assetGraph.findAssets({ type: 'Css' })[0].text,
          'to contain',
          `font-family: 'Venn VF__subset', 'Venn VF', Venn__subset, 'Venn', sans-serif;`
        );
      });
    });

    describe('with a variable font defined in a @supports block and a non-variable fallback with two variants', function () {
      it('should subset both the variable font and the fallback font', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-in-supports-block-with-two-fallback-variants/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        expect(fontInfo, 'to satisfy', [
          {
            fontUsages: [
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '300 800',
                  'font-style': 'normal',
                  'font-family': 'Venn VF',
                },
              },
              {
                text: 'dlorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '700',
                  'font-style': 'normal',
                  'font-family': 'Venn',
                },
              },
              {
                text: ' !,Helo',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '400',
                  'font-style': 'normal',
                  'font-family': 'Venn',
                },
              },
            ],
          },
        ]);
        const preloadFallbackJavaScript = assetGraph.findAssets({
          type: 'JavaScript',
        })[0];
        expect(
          preloadFallbackJavaScript.text,
          'to contain',
          "{'font-weight':'300 800'}"
        );
        expect(assetGraph, 'to contain asset', {
          fileName: {
            $regex: '^Venn_VF-300_800-[a-f0-9]+.woff2',
          },
        });
      });
    });

    describe('with two variable fonts that provide different font-weight ranges of the same font-family', function () {
      it('should subset both fonts when a CSS animation sweeps over both ranges', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/two-variable-fonts-animated/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          inlineFonts: false,
        });
        expect(fontInfo, 'to satisfy', [
          {
            fontUsages: [
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '1 500',
                  'font-style': 'normal',
                  'font-family': 'Venn VF',
                },
              },
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '501 900',
                  'font-style': 'normal',
                  'font-family': 'Venn VF',
                },
              },
            ],
          },
        ]);
      });
    });

    describe('with omitFallbacks:true', function () {
      it('should remove the original @font-face declarations and references to them, and not make subsets of unused variants', async function () {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/no-fallbacks/'
          ),
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await subsetFonts(assetGraph, {
          inlineFonts: false,
          omitFallbacks: true,
        });

        expect(htmlAsset.text, 'to contain', 'font-family: Roboto__subset;')
          .and('to contain', 'font: 14px Roboto__subset, serif;')
          .and('not to contain', 'font-family: Roboto;')
          .and('not to contain', "font-family: 'Roboto';")
          .and('not to contain', "font-family: 'font-style: italic;");

        expect(assetGraph, 'to contain no asset', {
          fileName: 'KFOmCnqEu92Fr1Mu4mxM.woff',
        });

        const cssAsset = assetGraph.findAssets({
          fileName: { $regex: /^fonts-.*\.css$/ },
        })[0];
        expect(cssAsset.text, 'not to contain', 'font-style:italic');
      });
    });

    describe('with a page that does need subsetting and one that does', function () {
      // https://gitter.im/assetgraph/assetgraph?at=5dbb6438a3f0b17849c488cf
      it('should not short circuit because the first page does not need any subset fonts', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/firstPageNoSubset/'
          ),
        });
        await assetGraph.loadAssets(['index-1.html', 'index-2.html']);
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          inlineFonts: false,
          omitFallbacks: true,
        });

        expect(fontInfo, 'to satisfy', [
          { htmlAsset: /\/index-1\.html$/, fontUsages: [] },
          {
            htmlAsset: /\/index-2\.html$/,
            fontUsages: [
              {
                text: ' ABCDEFGHIJKLM',
              },
            ],
          },
        ]);
      });
    });

    // From https://github.com/Munter/subfont/pull/84
    describe('with two pages that share the same CSS', function () {
      it('should discover subsets on both pages', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page-with-same-local-style-file/'
          ),
        });
        await assetGraph.loadAssets(['index.html', 'subindex.html']);
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          omitFallbacks: true,
        });
        expect(fontInfo, 'to have length', 2);
        expect(fontInfo, 'to satisfy', [
          {
            htmlAsset: /\/index\.html$/,
            fontUsages: [{ text: 'Wdlor' }, { text: ' ,Hbdehilmnosux' }],
          },
          {
            htmlAsset: /\/subindex\.html$/,
            fontUsages: [{ text: ' abcgko' }, { text: ' ,Hbdehilmnosux' }],
          },
        ]);
      });
    });

    describe('with two pages that have different non-UTF-16 characters', function () {
      it('should not break when combining the characters', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/emojis/'
          ),
        });
        await assetGraph.loadAssets(['index-1.html', 'index-2.html']);
        await assetGraph.populate();
        assetGraph.on('warn', () => {}); // Ignore warning about IBMPlexSans-Regular.woff not containing the emojis
        const { fontInfo } = await subsetFonts(assetGraph);
        expect(fontInfo, 'to have length', 2);
        expect(fontInfo, 'to satisfy', [
          {
            htmlAsset: /\/index-1.html$/,
            fontUsages: [{ pageText: ' 🤗🤞', text: ' 👊🤗🤞' }],
          },
          {
            htmlAsset: /\/index-2\.html$/,
            fontUsages: [{ pageText: ' 👊🤗', text: ' 👊🤗🤞' }],
          },
        ]);
      });
    });

    describe('when a subset is created, but an unused variant points at a file that does not exist', function () {
      it('should leave the url of the unused variant as-is', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/nonExistentFont/'
          ),
        });
        await assetGraph.loadAssets(['index.html']);
        assetGraph.on('warn', () => {}); // Don't halt on ENOENT Roboto-400-not-found-italic.woff2
        await assetGraph.populate();
        assetGraph.removeAllListeners('warn'); // Defensively don't suppress any further warnings
        const { fontInfo } = await subsetFonts(assetGraph);
        expect(fontInfo, 'to satisfy', [
          {
            htmlAsset: /\/index.html$/,
            fontUsages: [{ pageText: 'Helo', text: 'Helo' }],
          },
        ]);
        const subfontCss = assetGraph.findAssets({
          type: 'Css',
          path: '/subfont/',
        })[0];
        expect(
          subfontCss.text,
          'to contain',
          'src:url(/Roboto-400-not-found-italic.woff2) format("woff2")'
        );
      });
    });

    describe('when two pages @import the same CSS file which in turn imports a Google font', function () {
      // Regression test for https://github.com/Munter/netlify-plugin-subfont/issues/32
      it('should not break', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/two-pages-import-css/'
          ),
        });
        await assetGraph.loadAssets(['index1.html', 'index2.html']);
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph);
        expect(fontInfo, 'to satisfy', [
          {
            htmlAsset: /\/index1.html$/,
            fontUsages: [{ pageText: 'fo', text: 'fo' }],
          },
          {
            htmlAsset: /\/index2.html$/,
            fontUsages: [{ pageText: 'fo', text: 'fo' }],
          },
        ]);
      });
    });

    describe('with a CSS source map for a file that gets updated', function () {
      for (const testCase of ['external', 'inline']) {
        describe(testCase, function () {
          it('should update the source map', async function () {
            // lessc --source-map testdata/subsetFonts/css-source-map-${testCase}/styles.{less,css}
            const assetGraph = new AssetGraph({
              root: pathModule.resolve(
                __dirname,
                `../testdata/subsetFonts/css-source-map-${testCase}/`
              ),
            });
            await assetGraph.loadAssets('index.html');
            await assetGraph.populate();
            function checkSourceMap() {
              const [sourceMap] = assetGraph.findAssets({ type: 'SourceMap' });
              expect(sourceMap.parseTree.sources, 'to satisfy', {
                0: expect
                  .it('to equal', 'styles.less')
                  .or('to equal', '/styles.less'),
              });
              const cssAsset = sourceMap.incomingRelations[0].from;
              const generatedPosition = new LinesAndColumns(
                cssAsset.text
              ).locationForIndex(
                cssAsset.text.indexOf('border: 1px solid black')
              );
              const originalPosition = sourceMap.originalPositionFor({
                line: generatedPosition.line + 1, // source-map's line numbers are 1-based, lines-and-column's are 0-based
                column: generatedPosition.column,
              });
              const lessAsset = sourceMap.outgoingRelations.find(
                (relation) => relation.type === 'SourceMapSource'
              ).to;
              const lessText = lessAsset.rawSrc.toString('utf-8');
              const originalIndex = new LinesAndColumns(
                lessText
              ).indexForLocation({
                line: originalPosition.line - 1,
                column: originalPosition.column,
              });
              expect(
                lessText.slice(originalIndex),
                'to begin with',
                'border: 1px solid black'
              );
            }
            checkSourceMap();
            await subsetFonts(assetGraph);
            checkSourceMap();
          });
        });
      }
    });
  });

  describe('with non-truetype fonts in the mix', function () {
    it('should not attempt to subset non-truetype fonts', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/non-truetype-font/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });

      const html = assetGraph.findAssets({ type: 'Html' })[0];

      expect(html.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlStyle',
          to: {
            outgoingRelations: [
              {
                type: 'CssFontFaceSrc',
                href: 'one.eot',
              },
              {
                type: 'CssFontFaceSrc',
                href: 'two.eot?#iefix',
              },
              {
                type: 'CssFontFaceSrc',
                href: 'three.svg#icomoon',
              },
            ],
          },
        },
        { type: 'HtmlStyleAttribute' },
        { type: 'HtmlStyleAttribute' },
        { type: 'HtmlStyleAttribute' },
      ]);
    });

    it('should only subset truetype fonts despite non-truetype in the same declaration', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/non-truetype-and-truetype/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        inlineFonts: false,
      });
      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/icomoon-400-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.woff2'),
          to: {
            isLoaded: true,
          },
          as: 'font',
          contentType: 'font/woff2',
        },
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            isInline: true,
            text: expect.it('to contain', 'icomoon__subset'),
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/icomoon-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2',
                },
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff',
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyle',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.css'),
          to: {
            isLoaded: true,
            isInline: false,
            text: expect.it('to contain', 'icomoon__subset'),
            outgoingRelations: [
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/icomoon-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                },
              },
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/icomoon-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true,
                },
              },
            ],
          },
        },
        {
          type: 'HtmlStyleAttribute',
          to: {
            text: expect.it('to contain', 'icomoon__subset'),
          },
        },
        // Fallback loaders:
        {
          type: 'HtmlScript',
          hrefType: 'inline',
          to: {
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                to: {
                  type: 'Css',
                  isLoaded: true,
                  isInline: false,
                  text: expect.it('to contain', 'icomoon'),
                  outgoingRelations: [
                    {
                      href: '/icomoon.eot',
                      to: { isLoaded: true },
                    },
                    {
                      href: '/icomoon.eot?#iefix',
                      to: { isLoaded: true },
                    },
                    {
                      href: '/icomoon.woff',
                      to: { isLoaded: true },
                    },
                    {
                      href: '/icomoon.ttf',
                      to: { isLoaded: true },
                    },
                    {
                      href: '/icomoon.svg#icomoon',
                      to: { isLoaded: true },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          type: 'HtmlNoscript',
          hrefType: 'inline',
        },
      ]);
    });
  });
});
