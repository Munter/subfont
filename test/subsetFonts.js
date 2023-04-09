const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-set'))
  .use(require('assetgraph/test/unexpectedAssetGraph'));

const AssetGraph = require('assetgraph');
const pathModule = require('path');
const LinesAndColumns = require('lines-and-columns').default;

const httpception = require('httpception');
const sinon = require('sinon');
const fs = require('fs');
const subsetFonts = require('../lib/subsetFonts');
const getFontInfo = require('../lib/getFontInfo');

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
    await subsetFonts(assetGraph);

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
    assetGraph.on('info', function (info) {
      infos.push(info);
    });

    await assetGraph.loadAssets('index.html');
    await assetGraph.populate({
      followRelations: {
        crossorigin: false,
      },
    });
    await subsetFonts(assetGraph);

    expect(assetGraph, 'to contain no relation', 'HtmlPrefetchLink');

    expect(infos, 'to satisfy', [
      {
        message:
          'Detached <link rel="prefetch" as="font" type="application/x-font-ttf" href="OpenSans.ttf">. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/Munter/subfont/issues',
        asset: {
          type: 'Html',
        },
        relation: {
          type: 'HtmlPrefetchLink',
        },
      },
    ]);
  });

  it('should handle HTML <link rel=stylesheet>', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../testdata/subsetFonts/html-link/'),
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
    await subsetFonts(assetGraph);

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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
            },
          ],
        },
      },
    ]);
  });

  // Regression test for https://github.com/Munter/subfont/issues/130
  it('should not mess up the placement of unicode-range in the fallback css', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../testdata/subsetFonts/html-link/'),
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
    await subsetFonts(assetGraph, {
      inlineFonts: false,
    });

    const fallbackCss = assetGraph.findAssets({
      fileName: { $regex: /fallback-.*css$/ },
    })[0];
    expect(
      fallbackCss.text,
      'to match',
      /format\("woff"\);unicode-range:U\+0,U\+d,U\+20-7e,/i
    );
  });

  it('should return relevant font subsetting information', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../testdata/subsetFonts/html-link/'),
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
    const result = await subsetFonts(assetGraph);

    expect(result, 'to exhaustively satisfy', {
      fontInfo: [
        {
          assetFileName: 'testdata/subsetFonts/html-link/index.html',
          fontUsages: [
            {
              smallestOriginalSize: expect.it('to be greater than', 20000),
              smallestOriginalFormat: 'ttf',
              smallestSubsetSize: expect.it('to be less than', 4000),
              smallestSubsetFormat: 'woff2',
              texts: ['Hello'],
              pageText: 'Helo',
              text: 'Helo',
              props: {
                'font-stretch': 'normal',
                'font-weight': '400',
                'font-style': 'normal',
                'font-family': 'Open Sans',
                src: expect.it('to contain', "format('truetype')"),
              },
              fontUrl: expect.it(
                'to start with',
                'https://fonts.gstatic.com/s/opensans/'
              ),
              fontFamilies: expect.it('to be a', Set),
              fontStyles: expect.it('to be a', Set),
              fontWeights: expect.it('to be a', Set),
              fontStretches: expect.it('to be a', Set),
              fontVariationSettings: expect.it('to be a', Set),
              hasOutOfBoundsAnimationTimingFunction: false,
              codepoints: {
                original: expect.it('to be an array'),
                used: [32, 72, 101, 108, 111],
                unused: expect.it('to be an array'),
                page: [72, 101, 108, 111, 32],
              },
              preload: true,
            },
          ],
        },
      ],
    });
  });

  describe('with `inlineCss: true`', function () {
    it('should inline the font Css and change outgoing relations to rootRelative', async function () {
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
      await subsetFonts(assetGraph, {
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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
              },
            ],
          },
        },
      ]);
    });
  });

  it('should handle CSS @import', async function () {
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
    await subsetFonts(assetGraph);

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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
            },
          ],
        },
      },
    ]);
  });

  it('should add the __subset font name to the font shorthand property', async function () {
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

    await subsetFonts(assetGraph);

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

    await subsetFonts(assetGraph);

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
      inlineCss: true,
    });
  });

  describe('when only one font format is requested', function () {
    describe('on a single page', function () {
      it('should inline the font subsets', async function () {
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
          formats: ['woff2'],
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
        ]);
        // Regression test for https://github.com/Munter/subfont/pull/73
        expect(htmlAsset.text, 'not to contain', '<script>try{new FontFace');
      });

      it('should not inline unused variants', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });

        await subsetFonts(assetGraph, {
          formats: ['woff'],
        });
        const css = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/,
        })[0];

        expect(css.outgoingRelations, 'to satisfy', [
          {
            type: 'CssFontFaceSrc',
            hrefType: 'inline',
            to: {
              isInline: true,
              contentType: 'font/woff',
            },
          },
          {
            type: 'CssFontFaceSrc',
            hrefType: 'rootRelative',
            to: {
              isInline: false,
              fileName: 'KFOjCnqEu92Fr1Mu51TzBic6CsI.woff',
            },
          },
        ]);
      });
    });

    describe('on multiple pages', function () {
      describe('when a font is used on all pages', function () {
        it('should inline the font subsets', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/inline-subsets-multi-page/'
            ),
          });
          await assetGraph.loadAssets(['index-1.html', 'index-2.html']);
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });

          await subsetFonts(assetGraph, {
            formats: ['woff2'],
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
              href: /^data:font\/woff2;base64/,
              to: {
                isInline: true,
                contentType: `font/woff2`,
              },
            },
          ]);
        });
      });

      describe('when a font is not used on all pages', function () {
        it('should not inline the subset', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/inline-one-subset-multi-page/'
            ),
          });
          await assetGraph.loadAssets(['index-1.html', 'index-2.html']);
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });

          await subsetFonts(assetGraph, {
            formats: ['woff2'],
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
              hrefType: 'rootRelative',
              to: {
                isInline: false,
                contentType: `font/woff2`,
                fileName: /^IBM_Plex_Sans-400i-[a-f0-9]{10}\.woff2$/,
              },
            },
          ]);
        });
      });
    });
  });

  describe('when more than one font format is requested', function () {
    it('should not inline the font subsets', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/inline-subsets/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });

      await subsetFonts(assetGraph, {
        formats: ['woff', 'woff2'],
      });
      const css = assetGraph.findAssets({
        type: 'Css',
        fileName: /fonts-/,
      })[0];

      expect(css.outgoingRelations, 'to satisfy', [
        {
          type: 'CssFontFaceSrc',
          hrefType: `rootRelative`,
          to: {
            contentType: `font/woff2`,
          },
        },
        {
          type: 'CssFontFaceSrc',
          hrefType: `rootRelative`,
          to: {
            contentType: `font/woff`,
          },
        },
      ]);
    });
  });

  // Regression tests for https://github.com/Munter/subfont/issues/24
  describe('when the same Google Web Font is referenced multiple times', function () {
    it('should not break for two identical CSS @imports from the same asset', async function () {
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
      await subsetFonts(assetGraph);

      expect(assetGraph, 'to contain relation', 'CssImport');
      expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
    });

    it('should not break for two CSS @imports in different stylesheets', async function () {
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
      await subsetFonts(assetGraph);

      expect(assetGraph, 'to contain relation', 'CssImport');
      expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
    });
  });

  it('should handle multiple font-families', async function () {
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
    await subsetFonts(assetGraph);
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
            },
          ],
        },
      },
    ]);
  });

  it('should handle multiple font-weights and font-style', async function () {
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
    await subsetFonts(assetGraph);

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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
            },
          ],
        },
      },
    ]);
  });

  describe('when running on multiple pages', function () {
    it('should share a common subset across pages', async function () {
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
      await subsetFonts(assetGraph);

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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
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
          type: 'HtmlStyle',
          href: expect
            .it('to begin with', '/subfont/fonts-')
            .and('to end with', '.css')
            .and('to match', /[a-z0-9]{10}/),
          to: sharedFontStyles,
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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
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
                to: {
                  path: '/subfont/',
                  fileName: /^fallback-[a-f0-9]{10}\.css$/,
                },
              },
            ],
          },
        },
      ]);
    });

    it('should inject all @font-face declarations into every page, but only preload the used ones', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multi-entry-points-ssr/'
        ),
      });
      const [firstHtmlAsset, secondHtmlAsset] = await assetGraph.loadAssets([
        'first.html',
        'second.html',
      ]);
      await assetGraph.populate();
      await subsetFonts(assetGraph);
      expect(
        assetGraph.findRelations({
          from: firstHtmlAsset,
          type: 'HtmlPreloadLink',
        }),
        'to satisfy',
        [
          {
            href: expect.it('to begin with', '/subfont/font1-400-'),
          },
        ]
      );
      const firstSubfontCss = assetGraph.findRelations({
        from: firstHtmlAsset,
        type: 'HtmlStyle',
        to: { path: '/subfont/' },
      })[0].to;
      expect(
        firstSubfontCss.text,
        'to contain',
        'font-family:font1__subset'
      ).and('to contain', 'font-family:font2__subset');
      const secondSubfontCss = assetGraph.findRelations({
        from: secondHtmlAsset,
        type: 'HtmlStyle',
        to: { path: '/subfont/' },
      })[0].to;
      expect(firstSubfontCss, 'to be', secondSubfontCss);

      expect(
        assetGraph.findRelations({
          from: secondHtmlAsset,
          type: 'HtmlPreloadLink',
        }),
        'to satisfy',
        [
          {
            href: expect.it('to begin with', '/subfont/font2-400-'),
          },
        ]
      );
    });

    describe('when one of the pages does not use any webfonts, but has the original @font-face declarations', function () {
      it('should still include the __subset @font-face declarations on that page', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/one-page-with-no-usage-ssr/'
          ),
        });
        const [firstHtmlAsset, secondHtmlAsset] = await assetGraph.loadAssets([
          'first.html',
          'second.html',
        ]);
        await assetGraph.populate();
        await subsetFonts(assetGraph);
        const firstSubfontCss = assetGraph.findRelations({
          from: firstHtmlAsset,
          type: 'HtmlStyle',
          to: { path: '/subfont/' },
        })[0].to;
        expect(firstSubfontCss.text, 'to contain', 'font-family:font1__subset');
        const secondSubfontCss = assetGraph.findRelations({
          from: secondHtmlAsset,
          type: 'HtmlStyle',
          to: { path: '/subfont/' },
        })[0].to;
        expect(firstSubfontCss, 'to be', secondSubfontCss);
      });
    });

    describe('when one of the pages does not use any webfonts and does not have the @font-face declarations in scope', function () {
      it('should not include the __subset @font-face declarations on that page', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/one-page-with-no-font-face-ssr/'
          ),
        });
        const [firstHtmlAsset, secondHtmlAsset] = await assetGraph.loadAssets([
          'first.html',
          'second.html',
        ]);
        await assetGraph.populate();
        await subsetFonts(assetGraph);
        const firstSubfontCss = assetGraph.findRelations({
          from: firstHtmlAsset,
          type: 'HtmlStyle',
          to: { path: '/subfont/' },
        })[0].to;
        expect(firstSubfontCss.text, 'to contain', 'font-family:font1__subset');
        const secondSubfontCss = assetGraph.findRelations({
          from: secondHtmlAsset,
          type: 'HtmlStyle',
          to: { path: '/subfont/' },
        })[0];
        expect(secondSubfontCss, 'to be undefined');
      });
    });
  });

  describe('fontDisplay option', function () {
    it('should not add a font-display property when no fontDisplay is defined', async function () {
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
      await subsetFonts(assetGraph);

      const cssAsset = assetGraph.findAssets({
        type: 'Css',
        fileName: /fonts-/,
      })[0];

      expect(cssAsset.text, 'not to contain', 'font-display');
    });

    it('should not add a font-display property when an invalid font-display value is provided', async function () {
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
      await subsetFonts(assetGraph, {
        fontDisplay: 'foo',
      });

      const cssAsset = assetGraph.findAssets({
        type: 'Css',
        fileName: /fonts-/,
      })[0];

      expect(cssAsset.text, 'not to contain', 'font-display');
    });

    it('should add a font-display property', async function () {
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
      await subsetFonts(assetGraph, {
        fontDisplay: 'block',
      });

      const cssAsset = assetGraph.findAssets({
        type: 'Css',
        fileName: /fonts-/,
      })[0];

      expect(cssAsset.text, 'to contain', '@font-face{font-display:block');
    });

    it('should update an existing font-display property', async function () {
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
      await subsetFonts(assetGraph, {
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
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../testdata/subsetFonts/html-link/'),
    });
    const [htmlAsset] = await assetGraph.loadAssets('index.html');
    await assetGraph.populate({
      followRelations: {
        crossorigin: false,
      },
    });
    await subsetFonts(assetGraph, {
      inlineCss: true,
      omitFallbacks: true,
    });
    expect(
      htmlAsset.text,
      'not to contain',
      '<link href="https://fonts.googleapis.com'
    );
  });

  describe('with jsPreload:false', function () {
    it('should not add the JavaScript-based preload "polyfill"', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/unused-variant/'
        ),
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false,
        },
      });
      await subsetFonts(assetGraph, {
        jsPreload: false,
      });

      expect(htmlAsset.text, 'not to contain', 'new FontFace');
    });
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
        .and('to have message', 'Unrecognized font signature: 0000')
        .and('to satisfy', {
          asset: expect.it('to be an', 'AssetGraph.asset'),
        }),
      expect
        .it('to be an', Error)
        .and('to have message', 'Unrecognized font signature: 0000')
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
      await subsetFonts(assetGraph);

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
        await subsetFonts(assetGraph);

        const [originalFontFaceSrcRelation] = assetGraph.findRelations({
          type: 'CssFontFaceSrc',
          to: { fileName: 'OpenSans.ttf' },
        });
        expect(
          originalFontFaceSrcRelation.from.text,
          'to match',
          /unicode-range:U\+20-7e,U\+a0-ff,/i
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
        await subsetFonts(assetGraph);

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
          'to match',
          /unicode-range:U\+/i
        );
        const [inputMonoBoldRelation] = assetGraph.findRelations({
          type: 'CssFontFaceSrc',
          to: { fileName: 'InputMono-Medium.woff2' },
        });
        expect(
          inputMonoBoldRelation.node.toString(),
          'to match',
          /unicode-range:U\+/i
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
        await subsetFonts(assetGraph);

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
      await subsetFonts(assetGraph);

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
    await subsetFonts(assetGraph);

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

  it('should foo', async function () {
    httpception();

    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/subsetFonts/local-with-noscript/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await subsetFonts(assetGraph);

    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

    const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
    expect(index.outgoingRelations, 'to satisfy', [
      {
        type: 'HtmlPreloadLink',
      },
      {
        type: 'HtmlStyle',
      },
      {
        type: 'HtmlNoscript',
      },
      // Fallback loaders:
      {
        type: 'HtmlScript',
      },
      { type: 'HtmlNoscript' },
    ]);
  });

  describe('with hrefType:relative', function () {
    it('should issue relative urls instead of root-relative ones', async function () {
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
        hrefType: 'relative',
      });

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'relative',
          href: expect
            .it('to begin with', 'subfont/Open_Sans-400-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.woff2'),
          to: {
            isLoaded: true,
          },
          as: 'font',
          contentType: 'font/woff2',
        },
        {
          type: 'HtmlStyle',
          hrefType: 'relative',
          href: expect
            .it('to begin with', 'subfont/fonts-')
            .and('to match', /-[0-9a-f]{10}\./)
            .and('to end with', '.css'),
          to: {
            isLoaded: true,
            isInline: false,
            text: expect.it('to contain', 'Open Sans__subset'),
            outgoingRelations: [
              {
                hrefType: 'relative',
                href: expect
                  .it('to begin with', 'Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff2'),
                to: {
                  isLoaded: true,
                },
              },
              {
                hrefType: 'relative',
                href: expect
                  .it('to begin with', 'Open_Sans-400-')
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
      await subsetFonts(assetGraph);
      expect(htmlAsset.text, 'not to contain', '<style>');
    });
  });

  describe('when the stylesheet containing the original @font-face declarations did not contain anything else but a comment', function () {
    it('should be removed', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-with-no-css-rules-in-font-face-stylesheet-only-comment/'
        ),
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph);
      expect(htmlAsset.text, 'not to contain', '<style>');
    });
  });

  describe('when the stylesheet containing the original @font-face declarations did not contain anything else but a license comment', function () {
    it('should be preserved', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-with-no-css-rules-in-font-face-stylesheet-only-license-comment/'
        ),
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await subsetFonts(assetGraph);
      expect(
        htmlAsset.text,
        'to contain',
        '<style>/*! preserve me because of the exclamation mark */'
      );
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
      await subsetFonts(assetGraph);

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
      await subsetFonts(assetGraph);

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
      await subsetFonts(assetGraph);
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
        await subsetFonts(assetGraph);
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
    const { fontInfo } = await subsetFonts(assetGraph);

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
    const { fontInfo } = await subsetFonts(assetGraph);

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

    expect(htmlAsset.text, 'to contain', "font-family: foo__subset, 'foo'").and(
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
    const { fontInfo } = await subsetFonts(assetGraph);

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
      root: pathModule.resolve(__dirname, '../testdata/subsetFonts/html-link/'),
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
    await subsetFonts(assetGraph);

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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
    const { fontInfo } = await subsetFonts(assetGraph);
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
      await subsetFonts(assetGraph);
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
    await subsetFonts(assetGraph);

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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
              to: {
                path: '/subfont/',
                fileName: /^fallback-[a-f0-9]{10}\.css$/,
              },
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
      const { fontInfo } = await subsetFonts(assetGraph);
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
      const { fontInfo } = await subsetFonts(assetGraph);
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
      const { fontInfo } = await subsetFonts(assetGraph);
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

  describe('with a variable font that has unused axis ranges', function () {
    it('should emit an info event', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/variable-font-unused-axes/'
        ),
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const infoSpy = sinon.spy().named('info');
      assetGraph.on('info', infoSpy);

      await subsetFonts(assetGraph);

      expect(infoSpy, 'to have calls satisfying', function () {
        infoSpy({
          message: expect.it(
            'to contain',
            'RobotoFlex-VariableFont_GRAD,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,opsz,slnt,wdth,wght.ttf:\n  Unused axes: wght, wdth, GRAD, slnt, XOPQ, YOPQ, YTLC, YTUC, YTDE, YTFI\n  Underutilized axes:\n    YTAS: 649-750 used (649-854 available)'
          ),
        });
      });
    });

    describe('for the wght axis', function () {
      it('should emit an info event', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-unused-wght-axis/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const infoSpy = sinon.spy().named('info');
        assetGraph.on('info', infoSpy);

        await subsetFonts(assetGraph);

        expect(infoSpy, 'to have calls satisfying', function () {
          infoSpy({
            message: expect.it(
              'to contain',
              'Underutilized axes:\n    wght: 350-820 used (100-1000 available)'
            ),
          });
        });
      });
    });

    describe('for the wdth axis', function () {
      it('should emit an info event', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-unused-wdth-axis/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const infoSpy = sinon.spy().named('info');
        assetGraph.on('info', infoSpy);

        await subsetFonts(assetGraph);

        expect(infoSpy, 'to have calls satisfying', function () {
          infoSpy({
            message: expect.it(
              'to contain',
              'wdth: 87.5-147 used (25-151 available)'
            ),
          });
        });
      });
    });

    describe('for the ital axis', function () {
      describe('when only font-style: normal is used', function () {
        it('should emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-ital-axis/'
            ),
          });
          await assetGraph.loadAssets('normal.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it('to contain', 'Unused axes: ital'),
            });
          });
        });
      });

      describe('when only font-style: italic is used', function () {
        it('should emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-ital-axis/'
            ),
          });
          await assetGraph.loadAssets('italic.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it(
                'to contain',
                'Underutilized axes:\n    ital: 1 used (0-1 available)'
              ),
            });
          });
        });
      });

      describe('when both font-style: normal and font-style: italic are used', function () {
        it('should not emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-ital-axis/'
            ),
          });
          await assetGraph.loadAssets('normal_and_italic.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'was not called');
        });
      });
    });

    describe('for the slnt axis', function () {
      describe('when only font-style: normal is used', function () {
        it('should emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-slnt-axis/'
            ),
          });
          await assetGraph.loadAssets('normal.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it('to contain', 'Unused axes: slnt, TRAK, wght'),
            });
          });
        });
      });

      describe('when only font-style: oblique is used', function () {
        it('should emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-slnt-axis/'
            ),
          });
          await assetGraph.loadAssets('oblique.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it(
                'to contain',
                'Underutilized axes:\n    slnt: -14 used (-20-20 available)'
              ),
            });
          });
        });
      });

      describe('when both font-style: normal and font-style: oblique are used', function () {
        it('should emit an info event', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-unused-slnt-axis/'
            ),
          });
          await assetGraph.loadAssets('normal_and_oblique.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it(
                'to contain',
                'Underutilized axes:\n    slnt: -14-0 used (-20-20 available)'
              ),
            });
          });
        });
      });
    });

    describe('being animated with a cubic-bezier timing function', function () {
      describe('that stays within bounds', function () {
        it('should inform about the axis being underutilized', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-underutilized-axis-with-bezier/'
            ),
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it(
                'to contain',
                'Underutilized axes:\n    YTAS: 649-750 used (649-854 available)'
              ),
            });
          });
        });
      });

      describe('that goes out of bounds', function () {
        it('should not inform about the axis being underutilized', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/variable-font-underutilized-axis-with-bezier-out-of-bounds/'
            ),
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate();
          const infoSpy = sinon.spy().named('info');
          assetGraph.on('info', infoSpy);

          await subsetFonts(assetGraph);

          expect(infoSpy, 'to have calls satisfying', function () {
            infoSpy({
              message: expect.it('not to contain', 'YTAS:'),
            });
          });
        });
      });
    });
  });

  describe('instancing of variable fonts', function () {
    describe('with a variable font that can be fully instanced', function () {
      it('should remove the variation axes', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-that-can-be-fully-instanced/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const infoSpy = sinon.spy().named('info');
        assetGraph.on('info', infoSpy);

        await subsetFonts(assetGraph, { instance: true });

        const subsetFontAssets = assetGraph.findAssets({ type: 'Woff2' });
        expect(subsetFontAssets, 'to have length', 1);
        const { variationAxes } = await getFontInfo(subsetFontAssets[0].rawSrc);
        expect(variationAxes, 'to equal', {});
      });
    });

    describe('with a variable font that can only be partially instanced', function () {
      it('should keep the variation axes', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-that-can-be-partially-instanced/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const infoSpy = sinon.spy().named('info');
        assetGraph.on('info', infoSpy);

        await subsetFonts(assetGraph, { instance: true });

        const subsetFontAssets = assetGraph.findAssets({ type: 'Woff2' });
        expect(subsetFontAssets, 'to have length', 1);

        const { variationAxes } = await getFontInfo(subsetFontAssets[0].rawSrc);

        expect(variationAxes, 'to equal', {
          wght: { min: 100, default: 400, max: 1000 },
          wdth: { min: 25, default: 100, max: 151 },
          opsz: { min: 8, default: 14, max: 144 },
          GRAD: { min: -200, default: 0, max: 150 },
          slnt: { min: -10, default: 0, max: 0 },
          XTRA: { min: 323, default: 468, max: 603 },
          XOPQ: { min: 27, default: 96, max: 175 },
          YOPQ: { min: 25, default: 79, max: 135 },
          YTLC: { min: 416, default: 514, max: 570 },
          YTUC: { min: 528, default: 712, max: 760 },
          YTAS: { min: 649, default: 750, max: 854 },
          YTDE: { min: -305, default: -203, max: -98 },
          YTFI: { min: 560, default: 738, max: 788 },
        });
      });
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
        omitFallbacks: true,
      });

      expect(fontInfo, 'to satisfy', [
        {
          assetFileName: /\/index-1\.html$/,
          fontUsages: [
            {
              pageText: '',
              text: ' ABCDEFGHIJKLM',
            },
          ],
        },
        {
          assetFileName: /\/index-2\.html$/,
          fontUsages: [
            {
              pageText: ' ABCDEFGHIJKLM',
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
          assetFileName: /\/index\.html$/,
          fontUsages: [
            { text: 'Wdlor' },
            { text: ' ,Hbdehilmnosux' },
            {
              pageText: '',
              text: ' abcgko',
            },
          ],
        },
        {
          assetFileName: /\/subindex\.html$/,
          fontUsages: [
            { pageText: '', text: 'Wdlor' },
            { text: ' ,Hbdehilmnosux' },
            { text: ' abcgko' },
          ],
        },
      ]);
    });
  });

  describe('with two pages that have different non-UTF-16 characters', function () {
    it('should not break when combining the characters', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(__dirname, '../testdata/subsetFonts/emojis/'),
      });
      await assetGraph.loadAssets(['index-1.html', 'index-2.html']);
      await assetGraph.populate();
      assetGraph.on('warn', () => {}); // Ignore warning about IBMPlexSans-Regular.woff not containing the emojis
      const { fontInfo } = await subsetFonts(assetGraph);
      expect(fontInfo, 'to have length', 2);
      expect(fontInfo, 'to satisfy', [
        {
          assetFileName: /\/index-1.html$/,
          fontUsages: [{ pageText: ' 🤗🤞', text: ' 👊🤗🤞' }],
        },
        {
          assetFileName: /\/index-2\.html$/,
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
          assetFileName: /\/index.html$/,
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
          assetFileName: /\/index1.html$/,
          fontUsages: [{ pageText: 'fo', text: 'fo' }],
        },
        {
          assetFileName: /\/index2.html$/,
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

  // Regression test: Used to break with Cannot read property 'toLowerCase' of undefined
  it('should not break when a @font-face declaration is missing font-family', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/subsetFonts/missing-font-family/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await subsetFonts(assetGraph);
  });

  it('should handle escaped characters in font-family', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/subsetFonts/font-family-with-escape/'
      ),
    });
    const [htmlAsset] = await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    const { fontInfo } = await subsetFonts(assetGraph);
    expect(fontInfo, 'to satisfy', [
      { fontUsages: [{ fontFamilies: new Set(['Font Awesome 5 Free']) }] },
    ]);
    expect(
      htmlAsset.text,
      'to contain',
      "font-family: 'Font Awesome 5 Free__subset', Font Awesome\\ 5 Free;"
    ).and(
      'to contain',
      "font: 12px 'Font Awesome 5 Free__subset', 'Font Awesome 5 Free'"
    );
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
      await subsetFonts(assetGraph);

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
      await subsetFonts(assetGraph);
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

  describe('with -subfont-text', function () {
    describe('with a @font-face that is unused', function () {
      it('should make a subset with the specified characters', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/local-unused-with-subfont-text/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph);

        expect(fontInfo, 'to satisfy', {
          0: {
            fontUsages: [
              {
                texts: ['0123456789'],
                text: '0123456789',
              },
            ],
          },
        });

        // Make sure that the annotation gets stripped from the output:
        for (const cssAsset of assetGraph.findAssets({ type: 'Css' })) {
          expect(cssAsset.text, 'not to contain', '-subfont-text');
        }
      });
    });

    describe('with a @font-face that is also used', function () {
      describe('on a single page', function () {
        it('should add the specified characters to the subset', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/local-used-with-subfont-text/'
            ),
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate();
          const { fontInfo } = await subsetFonts(assetGraph);

          expect(fontInfo, 'to satisfy', {
            0: {
              fontUsages: [
                {
                  texts: ['0123456789', 'Hello, world!'],
                  text: ' !,0123456789Hdelorw',
                },
              ],
            },
          });

          // Make sure that the annotation gets stripped from the output:
          for (const cssAsset of assetGraph.findAssets({ type: 'Css' })) {
            expect(cssAsset.text, 'not to contain', '-subfont-text');
          }
        });
      });

      describe('when the CSS is shared between multiple pages', function () {
        it('should add the specified characters to the subset', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/local-used-multipage-with-subfont-text/'
            ),
          });
          await assetGraph.loadAssets('page*.html');
          await assetGraph.populate();
          const { fontInfo } = await subsetFonts(assetGraph);

          expect(fontInfo, 'to satisfy', {
            0: {
              fontUsages: [
                {
                  texts: ['0123456789', 'Hello, world!', 'Aloha, world!'],
                  text: ' !,0123456789AHadehlorw',
                },
              ],
            },
            1: {
              fontUsages: [
                {
                  texts: ['0123456789', 'Hello, world!', 'Aloha, world!'],
                  text: ' !,0123456789AHadehlorw',
                },
              ],
            },
          });

          // Make sure that the annotation gets stripped from the output:
          for (const cssAsset of assetGraph.findAssets({ type: 'Css' })) {
            expect(cssAsset.text, 'not to contain', '-subfont-text');
          }
        });
      });
    });
  });

  describe('with text explicitly passed to be included in all fonts', function () {
    describe('with a @font-face that is unused', function () {
      it('should make a subset with the specified characters', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/local-unused/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          text: '0123456789',
        });

        expect(fontInfo, 'to satisfy', {
          0: {
            fontUsages: [
              {
                texts: ['0123456789'],
                text: '0123456789',
              },
            ],
          },
        });
      });
    });

    describe('with a @font-face that is used', function () {
      it('should add the specified characters to the subset', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/local-used/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await subsetFonts(assetGraph, {
          text: '0123456789',
        });

        expect(fontInfo, 'to satisfy', {
          0: {
            fontUsages: [
              {
                texts: ['0123456789', 'Hello, world!'],
                text: ' !,0123456789Hdelorw',
              },
            ],
          },
        });
      });
    });
  });

  describe('with SVG using webfonts', function () {
    describe('in a standalone SVG', function () {
      it('should trace the correct characters and patch up the stylesheet', async function () {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/svg/img-element/'
          ),
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false,
          },
        });
        const result = await subsetFonts(assetGraph);

        expect(result, 'to satisfy', {
          fontInfo: [
            {
              fontUsages: [
                {
                  text: ' !,Hdelorw',
                  props: {
                    'font-stretch': 'normal',
                    'font-weight': '400',
                    'font-style': 'normal',
                    'font-family': 'Roboto',
                    src: expect.it('to contain', "format('woff')"),
                  },
                },
              ],
            },
          ],
        });

        const svgAsset = assetGraph.findAssets({ type: 'Svg' })[0];
        expect(
          svgAsset.text,
          'to contain',
          '<text x="20" y="50" font-family="Roboto__subset, Roboto">Hello, world!</text>'
        );

        const svgStyle = assetGraph.findRelations({ type: 'SvgStyle' })[0];
        expect(svgStyle, 'to be defined');
        expect(
          svgStyle.to.text,
          'to contain',
          '@font-face{font-family:Roboto__subset;'
        );
      });
    });

    describe('within HTML', function () {
      describe('using webfonts defined in a stylesheet in the HTML', function () {
        it('should trace the correct characters and patch up the font-family attribute', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/svg/inline-in-html-with-html-font-face/'
            ),
          });
          const [htmlAsset] = await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          const result = await subsetFonts(assetGraph);

          expect(result, 'to satisfy', {
            fontInfo: [
              {
                fontUsages: [
                  {
                    text: ' !,Hdelorw',
                    props: {
                      'font-stretch': 'normal',
                      'font-weight': '400',
                      'font-style': 'normal',
                      'font-family': 'Roboto',
                      src: expect.it('to contain', "format('woff')"),
                    },
                  },
                ],
              },
            ],
          });

          expect(
            htmlAsset.text,
            'to contain',
            '<text x="20" y="50" font-family="Roboto__subset, Roboto">Hello, world!</text>'
          );
        });
      });

      describe('using webfonts defined in a stylesheet defined in the SVG', function () {
        it('should trace the correct characters and patch up the SVG stylesheet', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/svg/inline-in-html-with-own-font-face/'
            ),
          });
          const [htmlAsset] = await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          const result = await subsetFonts(assetGraph);

          expect(result, 'to satisfy', {
            fontInfo: [
              {
                fontUsages: [
                  {
                    text: ' !,Hdelorw',
                    props: {
                      'font-stretch': 'normal',
                      'font-weight': '400',
                      'font-style': 'normal',
                      'font-family': 'Roboto',
                      src: expect.it('to contain', "format('woff')"),
                    },
                  },
                ],
              },
            ],
          });

          expect(
            htmlAsset.text,
            'to contain',
            '<text x="20" y="50" font-family="Roboto__subset, Roboto">Hello, world!</text>'
          );

          const svgStyle = assetGraph.findRelations({ type: 'SvgStyle' })[0];
          expect(svgStyle, 'to be defined');
          expect(
            svgStyle.to.text,
            'to contain',
            '@font-face{font-family:Roboto__subset;'
          );
        });
      });

      describe('using a webfont defined both in the HTML and the SVG', function () {
        it('should trace the correct characters in both contexts and patch up both stylesheets', async function () {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/svg/inline-in-html-font-face-in-both-places/'
            ),
          });
          const [htmlAsset] = await assetGraph.loadAssets('index.html');
          await assetGraph.populate({
            followRelations: {
              crossorigin: false,
            },
          });
          const result = await subsetFonts(assetGraph);

          expect(result, 'to satisfy', {
            fontInfo: [
              {
                assetFileName:
                  'testdata/subsetFonts/svg/inline-in-html-font-face-in-both-places/index.html',
                fontUsages: [
                  {
                    pageText: ' !,HYadelorwy', // Also includes the "Yay" in the HTML
                    text: ' !,HYadelorwy',
                    props: {
                      'font-stretch': 'normal',
                      'font-weight': '400',
                      'font-style': 'normal',
                      'font-family': 'Roboto',
                      src: expect.it('to contain', "format('woff')"),
                    },
                  },
                ],
              },
              {
                assetFileName:
                  'testdata/subsetFonts/svg/inline-in-html-font-face-in-both-places/index.html', // The SVG island
                fontUsages: [
                  {
                    pageText: ' !,Hdelorw', // Does not include the "Yay" in the HTML
                    text: ' !,HYadelorwy',
                    props: {
                      'font-stretch': 'normal',
                      'font-weight': '400',
                      'font-style': 'normal',
                      'font-family': 'Roboto',
                      src: expect.it('to contain', "format('woff')"),
                    },
                  },
                ],
              },
            ],
          });

          expect(
            htmlAsset.text,
            'to contain',
            '<text x="20" y="50" font-family="Roboto__subset, Roboto">Hello, world!</text>'
          );

          const htmlStyle = assetGraph.findRelations({ type: 'HtmlStyle' })[0];
          expect(htmlStyle, 'to be defined');
          expect(
            htmlStyle.to.text,
            'to contain',
            '@font-face{font-family:Roboto__subset;'
          );

          const svgStyle = assetGraph.findRelations({ type: 'SvgStyle' })[0];
          expect(svgStyle, 'to be defined');
          expect(
            svgStyle.to.text,
            'to contain',
            '@font-face{font-family:Roboto__subset;'
          );
        });
      });
    });
  });
});
