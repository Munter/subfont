const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('assetgraph/test/unexpectedAssetGraph'));

const AssetGraph = require('assetgraph');
const pathModule = require('path');

const proxyquire = require('proxyquire');
const httpception = require('httpception');
const sinon = require('sinon');
const fs = require('fs');

const fontCssUrlRegExp = /\/subfont\/fonts-[a-z0-9]{10}\.css$/;

const defaultGoogleFontSubsetMock = [
  {
    request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
    response: {
      headers: {
        'Content-Type': 'text/css'
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff) format('woff');",
        '}'
      ].join('\n')
    }
  },
  {
    request:
      'GET https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFVZ0d.woff',
    response: {
      headers: {
        'Content-Type': 'font/woff'
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.woff'
        )
      )
    }
  },
  {
    request:
      'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff2',
    response: {
      headers: {
        'Content-Type': 'text/css'
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2) format('woff2');",
        '}'
      ].join('\n')
    }
  },
  {
    request:
      'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff',
    response: {
      headers: {
        'Content-Type': 'text/css'
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff) format('woff');",
        '}'
      ].join('\n')
    }
  },
  {
    request:
      'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2',
    response: {
      headers: {
        'Content-Type': 'font/woff2'
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.woff2'
        )
      )
    }
  },
  {
    request:
      'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff',
    response: {
      headers: {
        'Content-Type': 'font/woff'
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.woff'
        )
      )
    }
  }
];

const defaultLocalSubsetMock = [
  {
    request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
    response: {
      headers: {
        'Content-Type': 'text/css'
      },
      body: [
        '@font-face {',
        "  font-family: 'Open Sans';",
        '  font-style: normal;',
        '  font-weight: 400;',
        "  src: local('Open Sans Regular'), local('OpenSans-Regular'), url(https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf) format('truetype');",
        '}'
      ].join('\n')
    }
  },
  {
    request:
      'GET https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf',
    response: {
      headers: {
        'Content-Type': 'font/ttf'
      },
      body: fs.readFileSync(
        pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/OpenSans-400.ttf'
        )
      )
    }
  }
];

describe('transforms/subsetFonts', function() {
  describe('without fonttools installed', function() {
    const subsetFontsWithoutFontTools = proxyquire('../lib/subsetFonts', {
      './subsetLocalFont': null
    });

    it('should emit an info about font subsetting tool not being available', async function() {
      httpception();

      const infos = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      assetGraph.on('info', function(warning) {
        infos.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

      expect(infos, 'to satisfy', [
        expect.it('to be an', Error) // Can't get the right type of error due to limited mocking abilities
      ]);
    });

    it('should not break when there is an existing preload hint pointing to a font file', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/existing-preload/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(subsetFontsWithoutFontTools());

      expect(assetGraph, 'to contain relation', 'HtmlPreloadLink');
    });

    it('should emit an info event when detaching prefetch relations to original fonts', async function() {
      httpception();

      const infos = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/existing-prefetch/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      assetGraph.on('info', function(info) {
        infos.push(info);
      });

      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(subsetFontsWithoutFontTools());

      expect(assetGraph, 'to contain no relation', 'HtmlPrefetchLink');

      expect(infos, 'to satisfy', [
        {
          message:
            'Local subsetting is not possible because fonttools are not installed. Falling back to only subsetting Google Fonts. Run `pip install fonttools brotli zopfli` to enable local font subsetting'
        },
        {
          message:
            'Detached <link rel="prefetch" as="font" type="application/x-font-ttf" href="OpenSans.ttf">. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/assetgraph/assetgraph/issues',
          asset: {
            type: 'Html'
          },
          relation: {
            type: 'HtmlPrefetchLink'
          }
        }
      ]);
    });

    it('should preload local fonts that it could not subset', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: '/OpenSans.ttf',
          to: {
            isLoaded: true
          },
          as: 'font',
          contentType: 'font/ttf'
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
                  isLoaded: true
                }
              }
            ]
          }
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
                  isLoaded: true
                }
              }
            ]
          }
        }
      ]);
    });

    it('should handle HTML <link rel=stylesheet>', async function() {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

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
            isLoaded: true
          },
          as: 'font'
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
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset')
          }
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
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
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
        }
      ]);
    });

    describe('with `inlineCss: true`', function() {
      it('should inline the font Css and change outgoing relations to rootRelative', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          )
        });
        assetGraph.on('warn', warn =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            inlineCss: true
          })
        );

        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: '/subfont/Open_Sans-400-cffb686d7d.woff2',
            to: {
              isLoaded: true
            },
            as: 'font'
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
                    extension: '.woff2'
                  }
                },

                {
                  hrefType: 'rootRelative',
                  to: {
                    contentType: 'font/woff',
                    extension: '.woff'
                  }
                }
              ]
            }
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com'
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com'
          },
          {
            type: 'HtmlScript',
            to: {
              type: 'JavaScript',
              isInline: true,
              text: expect
                .it('to contain', 'document.fonts.forEach')
                .and('to contain', '__subset')
            }
          },
          {
            type: 'HtmlStyle',
            to: {
              isInline: true,
              text: expect.it('to contain', 'Open Sans__subset')
            }
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
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
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
          }
        ]);
      });
    });

    it('should handle CSS @import', async function() {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/css-import/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

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
            isLoaded: true
          },
          as: 'font'
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
                href: '/subfont/Open_Sans-400-cffb686d7d.woff2',
                to: {
                  isLoaded: true
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset')
          }
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
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
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
        }
      ]);
    });

    it('should add the __subset font name to the font shorthand property', async function() {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-shorthand/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });

      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

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

    it('should add the __subset font name to a custom property that contributes to the font-family property', async function() {
      httpception(defaultGoogleFontSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-shorthand-with-custom-property/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      const [htmlAsset] = await assetGraph.loadAssets('index.html');

      // Remove annoying trailing \n inserted by jsdom that breaks the test because it makes us ask GWF to include space in the subset
      htmlAsset.parseTree.body.lastChild.nodeValue = '';

      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });

      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

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

    it('should not break if there is an existing reference to a Google Web Font CSS inside a script', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/google-webfont-ref-in-javascript/'
        )
      });
      assetGraph.on('warn', console.log);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false,
        inlineCss: true
      });
    });

    describe('with `inlineSubsets: true`', function() {
      it('should inline the font subset', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/inline-subsets/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });

        await assetGraph.subsetFonts({
          inlineSubsets: true
        });
        const css = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/
        })[0];

        expect(css.outgoingRelations, 'to satisfy', [
          {
            type: 'CssFontFaceSrc',
            hrefType: `inline`,
            href: /^data:font\/woff2;base64/,
            to: {
              isInline: true,
              contentType: `font/woff2`
            }
          },
          {
            type: 'CssFontFaceSrc',
            hrefType: `inline`,
            href: /^data:font\/woff;base64/,
            to: {
              isInline: true,
              contentType: `font/woff`
            }
          }
        ]);
      });
    });

    // Regression tests for https://github.com/Munter/subfont/issues/24
    describe('when the same Google Web Font is referenced multiple times', function() {
      it('should not break for two identical CSS @imports from the same asset', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/css-import-twice/'
          )
        });

        await assetGraph.loadAssets('index.html').populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false
          })
        );

        expect(assetGraph, 'to contain relation', 'CssImport');
        expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
      });

      it('should not break for two CSS @imports in different stylesheets', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/css-import-twice-different-css/'
          )
        });

        await assetGraph.loadAssets('index.html').populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false
          })
        );
        expect(assetGraph, 'to contain relation', 'CssImport');
        expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
      });
    });

    it('should handle multiple font-families', async function() {
      httpception([
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Jim Nightshade";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400) format("woff");',
              '}',

              '@font-face {',
              '  font-family: "Montserrat";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400) format("woff");',
              '}',

              '@font-face {',
              '  font-family: "Space Mono";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400) format("woff");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/JimNightshade-400.woff'
              )
            )
          }
        },
        {
          request: 'GET https://fonts.gstatic.com/l/font?kit=Montserrat:400',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Montserrat-400.woff'
              )
            )
          }
        },
        {
          request: 'GET https://fonts.gstatic.com/l/font?kit=Space+Mono:400',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/SpaceMono-400.woff'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Jim Nightshade";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Montserrat";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Space Mono";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Jim Nightshade";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Montserrat";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Space Mono";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/JimNightshade-400.woff2'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Montserrat-400.woff2'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/SpaceMono-400.woff2'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/JimNightshade-400.woff'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Montserrat-400.woff'
              )
            )
          }
        },
        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/SpaceMono-400.woff'
              )
            )
          }
        }
      ]);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multi-family/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );
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
            isLoaded: true
          },
          as: 'font'
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Montserrat-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true
          },
          as: 'font'
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Space_Mono-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true
          },
          as: 'font'
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
                href: '/subfont/Jim_Nightshade-400-8fb9df8958.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: '/subfont/Montserrat-400-501ce09c42.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: '/subfont/Space_Mono-400-d96ed1a379.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Jim Nightshade__subset')
              .and('to contain', 'Montserrat__subset')
              .and('to contain', 'Space Mono__subset')
          }
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href:
                  'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono'
              }
            ]
          }
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
                  'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono'
              }
            ]
          }
        }
      ]);
    });

    it('should handle multiple font-weights and font-style', async function() {
      httpception([
        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: italic;',
              '  font-weight: 300;',
              '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i) format("woff");',
              '}',

              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400) format("woff");',
              '}',

              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 500;',
              '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500) format("woff");',
              '}'
            ].join('\n')
          }
        },

        {
          request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:300i',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-300i.woff'
              )
            )
          }
        },
        {
          request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:400',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-400.woff'
              )
            )
          }
        },
        {
          request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:500',
          response: {
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-500.woff'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 500;',
              '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Roboto"), local("Roboto-Regular"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru&format=woff2',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: italic;',
              '  font-weight: 300;',
              '  src: local("Roboto Light Italic"), local("Roboto-LightItalic"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff2) format("woff2");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 500;',
              '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: normal;',
              '  font-weight: 400;',
              '  src: local("Roboto"), local("Roboto-Regular"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru&format=woff',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: [
              '@font-face {',
              '  font-family: "Roboto";',
              '  font-style: italic;',
              '  font-weight: 300;',
              '  src: local("Roboto Light Italic"), local("Roboto-LightItalic"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff) format("woff");',
              '}'
            ].join('\n')
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-500.woff2'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-400.woff2'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff2',
          response: {
            headers: {
              'Content-Type': 'font/woff2'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-300.woff2'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-500.woff'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-400.woff'
              )
            )
          }
        },

        {
          request:
            'GET https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff',
          response: {
            headers: {
              'Content-Type': 'font/woff'
            },
            body: fs.readFileSync(
              pathModule.resolve(
                __dirname,
                '../testdata/subsetFonts/Roboto-300.woff'
              )
            )
          }
        }
      ]);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multi-weight/'
        )
      });
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /Cannot find module/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.queue(
        subsetFontsWithoutFontTools({
          inlineSubsets: false
        })
      );

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
            isLoaded: true
          },
          as: 'font'
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Roboto-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true
          },
          as: 'font'
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Roboto-300i-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true
          },
          as: 'font'
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
                href: '/subfont/Roboto-500-285467176f.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: '/subfont/Roboto-400-5d4aeb4e5f.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                href: '/subfont/Roboto-300i-55536c8e9e.woff2',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Roboto__subset')
          }
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href:
                  'https://fonts.googleapis.com/css?family=Roboto:300i,400,500'
              }
            ]
          }
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
                  'https://fonts.googleapis.com/css?family=Roboto:300i,400,500'
              }
            ]
          }
        }
      ]);
    });

    describe('when running on multiple pages with subsetPerPage:true', function() {
      it('should have an individual subset for each page', async function() {
        httpception([
          {
            request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=OpenSans:400) format('woff');",
                '}'
              ].join('\n')
            }
          },

          {
            request: 'GET https://fonts.gstatic.com/l/font?kit=OpenSans:400',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.woff'
                )
              )
            }
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abotu&format=woff2',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheB8f54N-i&skey=62c1cbfccc78b4b2&v=v15) format('woff2');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20ehmo&format=woff2',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheBsPz4sQ&skey=62c1cbfccc78b4b2&v=v15) format('woff2');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abotu&format=woff',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8bNKoDdtM&skey=62c1cbfccc78b4b2&v=v15) format('woff');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20ehmo&format=woff',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8aMKABbQ&skey=62c1cbfccc78b4b2&v=v15) format('woff');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheB8f54N-i&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff2'
              },
              body: Buffer.from(
                'd09GMgABAAAAAAOwAA4AAAAABkgAAANdAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbEBwaBmAAPBEQCoNMgxILDgABNgIkAxgEIAWDWgcgGwkFyAQC/r1yXrRQidyV4tE1szWwKMQvZeKa+g/4gHn+btlWFLmg39MySCeYqbOBTmDgsmHsApfQiACcCEXKeSoirNtx4q5l83YOcsFSYtiAZKyMhOdl5YCYhQrqErUSiILhPvk20eK7VZIcmiarCuhUxkAxoNGgpys06NSI+uihWbSC/7MxwTpd6q4jVtb7SnP1APJ05HU1eYeQQnkSQlakV8NJYaBpAmGkMMA0zVXmPHNWP37Hkgyb7biwmCaesqIh+rT0/kFDu9bTUG6AtgHx3Xkc2ZwuZ87smbvafT67ERDjU7qJsQG70blrMOjw+lHCvUEhOvt8jPEP996Xxt2zG4Gu9s724Q5pTGdHsIvhY4zf4Q2KsYHh417ZjcADMf6tw/t6yBh/zVt2w5fiDRZjnc8+TVbtols3By6cyhj/cKU9UR1W+9r/htpRX2rtEL2m+bC1hzYubZ3Fc1htPDZ52LCp2zpVHNW+1KkKYeeObT/16fuApbs2L45Yr53XdiRm9EzsQ8lXPe99Kep2fysZSNjVtlYHZ+i0wWjZNgwbbYm0Zqy9amyZf+bt28UXtiye/+R2YP5tmoYWcbpKf5n7cupwsd3pKPnljbtC5QrqnY0P167d9ODu7U331q9d7yfzgNIdnINGb4vNVLJuu2nL2y9r3OR9//91x9adGNEnjmznml+cNHT8uG0rjvrrb2g+NeccW8X2+7oMuHTh+O3rwJ9aL3I/HLB56bd+ntq/rTYaXK5SwRue9Je65v+z5J/ftsYaDtjenBnxo3X6v01g2/Znyf/htjXvzeLXNeU6p5UM+ipv2aX4yZDuUlB5z7peRQ2DHHT95X0W+8dcK9Gxpdi4ml5DQUeQhbMQl3AzAZepzBxcIZQLuEou3iUaupjjs246C53GxBFDHAOIYxhRRKITSRgDCEMnghRSGUp6DzD2ks5mdCpSngqUp0x8qAKl0WlGCinEkIiadRqRQjqpPj2XFIeJyZSlHalE5TqdCGOvZNCRKGIYSCJhpFOBsvNKtXS4AZ1oxPfn2aIycMh8i3Re7koU6WTswNBXGGtW+ryrBpBKTcpRjsF2XpYwUnkxgliiKHu6PIZyJHIlYiYpQzudQTla04JGNKEtnWhyU1JZrsqvvMyMJhoLAAA=',
                'base64'
              )
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheBsPz4sQ&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff2'
              },
              body: Buffer.from(
                'd09GMgABAAAAAANYAA4AAAAABewAAAMEAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbEBwaBmAARBEQCoJwgkkLDAABNgIkAxQEIAWDWgcgG8QEyAQC/r1ykn1ZsEQqHYxC2i1g5K4Qv5T5Pxd/wtXzuWVfJHVSFukJdoGkT+yGsVtQ4F+OBNhxZHnkF0h1xood5yoz9hSjhFrRvU3fnpgtQt1vEPulmSigLFb8QSpfrzPcoqP03SzLNqPRoAilUYyEakD8pat9Y+vFE4NasZCx/P8ijDVPkxurSCvWAyJF2a/5VQxoVQOBfkEICZvMyMh0oDM9cOu6wvdV+lJ9sT5fn3eaS6jbs8xYcWDSdVwrslICq2i0gFtdfXJUCOIMCbmIqXhlh73H5DeGMW9tU+4rP3Nqmm1KI+7eHTz5bn3XqLyCyqg86+S7COsQmzxSteXn26ZoiCFLfOOz2BrsuKc12C8e/co6Oe+BBNT7euBIy54vHbTq8MI/S1QzWUTwo+tfnU+6/BQnD17YuGtr6txGVZaqljOvxy7d4lgQuWzKepafGz9ozOhty4/kRa7HWGR9foMBVp+svU37Xrp4/OYV2uZwaYx7dP8lc3Ydar++s9aApTMPa9HrUyaUmmf2yt7cpKuUdcjs0+BQuwGHDx6/fYWkilXsjtpf5rycNETaZrfV/PLG6Rvgq9ze8HDNmo0P7tzaeG/dmnUaAEj53JIP5c5rardyRfw2W/5E8FKg75T6Ca3WVe3P4n+aZbW5LWBBvvGnedq/jWDZ+mfx/yGW1ZKitNsUcY1TYhh9xHt2mnqxU2j0OVGoMJliNFQ7nGe+h89Mx9YUFlvpvUKqXolCNqNiMk7GYgYCmI0JKnIeUyjBu6gRVQLxWif1JZUEutCJLvSlC4PpQHtU2tOGvrRBpR1uPAyi9wnQ+ZDKJlT88MEXH+q0m3ypjUoybtx0ortWrRKPm954SgqU2EXH98SLbDx0SKjUo411Sx/q0oFO9KM7beiNL15gxfAQiqUe8dx5zppUR+0CbpJqVzakA73pQ4CuIugLKMXurL54CMMbbwakCS/a4LFL29GZDngxl+iEN91tuR0gsU+wuw/eZJBKPIlkUY9EQYletmKQ8DS9Ix1JAAAAAA==',
                'base64'
              )
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8bNKoDdtM&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: Buffer.from(
                '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',
                'base64'
              )
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8aMKABbQ&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: Buffer.from(
                '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',
                'base64'
              )
            }
          }
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page/'
          )
        });
        assetGraph.on('warn', warn =>
          // FIXME: The mocked out woff and woff2 fonts from Google don't contain space.
          // Redo the mocks so we don't have to allow 'Missing glyph' here:
          expect(warn, 'to satisfy', /Missing glyph|Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            subsetPerPage: true
          })
        );

        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
        expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
        const about = assetGraph.findAssets({ fileName: 'about.html' })[0];

        // Subsets
        expect(
          assetGraph.findRelations({
            type: 'HtmlStyle',
            crossorigin: false,
            to: { isInline: false }
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
                      fileName: 'Open_Sans-400-8ea2a77d91.woff2',
                      isLoaded: true,
                      isInline: false
                    }
                  },
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: 'Open_Sans-400-ae6be69ecc.woff',
                      isLoaded: true,
                      isInline: false
                    }
                  }
                ]
              }
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
                      fileName: 'Open_Sans-400-93dbe92b2a.woff2',
                      isLoaded: true,
                      isInline: false
                    }
                  },
                  {
                    type: 'CssFontFaceSrc',
                    hrefType: 'rootRelative',
                    to: {
                      fileName: 'Open_Sans-400-c9253c6736.woff',
                      isLoaded: true,
                      isInline: false
                    }
                  }
                ]
              }
            }
          ]
        );

        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: '/subfont/Open_Sans-400-8ea2a77d91.woff2',
            to: {
              isLoaded: true
            },
            as: 'font'
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
                  href: '/subfont/Open_Sans-400-8ea2a77d91.woff2',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2'
                  }
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff'
                  }
                }
              ]
            }
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: {
              isLoaded: true
            }
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com'
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com'
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true }
          },
          {
            type: 'HtmlAnchor',
            href: 'about.html'
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
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
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
          }
        ]);

        const indexFontStyle = index.outgoingRelations[1].to;
        const indexFont = index.outgoingRelations[0].to;

        expect(about.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: '/subfont/Open_Sans-400-93dbe92b2a.woff2',
            to: expect.it('not to be', indexFont),
            as: 'font'
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
                  href: '/subfont/Open_Sans-400-93dbe92b2a.woff2',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2'
                  }
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff'
                  }
                }
              ]
            }
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: expect.it('not to be', indexFontStyle)
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com'
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com'
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true }
          },
          {
            type: 'HtmlAnchor',
            href: 'index.html'
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
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
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
          }
        ]);
      });
    });

    describe('when running on multiple pages with subsetPerPage:false', function() {
      it('should share a common subset across pages', async function() {
        httpception([
          {
            request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=OpenSans:400) format('woff');",
                '}'
              ].join('\n')
            }
          },

          {
            request: 'GET https://fonts.gstatic.com/l/font?kit=OpenSans:400',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.woff'
                )
              )
            }
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abehmotu&format=woff2',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheCsf56sO6Mlzz&skey=62c1cbfccc78b4b2&v=v15) format('woff2');",
                '}'
              ].join('\n')
            }
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=%20abehmotu&format=woff',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8WNKoJasv0-94&skey=62c1cbfccc78b4b2&v=v15) format('woff');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1V5ccXcheCsf56sO6Mlzz&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff2'
              },
              body: Buffer.from(
                'd09GMgABAAAAAASAAA4AAAAAB4QAAAQuAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbEBwaBmAAVBEQCoVghG0LFAABNgIkAyQEIAWDWgcgGwgGyAQe4LflQ0ERPJfFMuMqStcR4qL6q5y4pn4APWCev1sWLbIoi3Rgr8vS2YvBfAqyewKW2IwAWBE1QyYgIwQlBSu2Sj7rLU1ZqiXEMyYMmaep60ZxvzATCaTFUnMQqgTHjLfwE77LBoNqMhklkfSKGVAb6N7r7aZdh3enC1q14qYq/0uSI08zjNEQVlTHxD7SfjqgYZzXMK4QEenzmg0ZAya88CWAUMKJdbuJ5ZkFYja6V7qXu5e6F7oXuOcMHDJZ2CYZBQ/MbjdFKmGLUfwkgGcuoXdnSzwZ1mJVzvst5dWS1pLmMjU8rGVKFRulOJ2K3SVkh48WMl2KfcSou3dVh47o5bgrCCOcTjL0ZMd9Q9Y9xe4apYxQklVDxgj17ki7kwxdddwVMl2h9jfG7Leq4z7YdF11jMbpTLI7RxTJdBWTMl2K3YmoJKuGDE29e1d16IjJUqZLsTsRFclvUUc2eKaNbK7PeqXYXQ8EaOh1QsY8Xyl2Z7jjbm3WOpWpRkkRRo9W8cAqZujJIp2WVFnZ0X9BGqYtkYf6re6TtObghiUDihc5JPXIDEtKKtw6vFnakPonm3qePbrt5KfvMUt2blrkvc50zrQ9JHpcyETqvRp370stm+1bPVfwzkHth1qrTY3HVHJ9UrrZR45ec8W+ed7pt28Xnd+8aN6TW655t0gr8bNsbbNFbP3o+lfbk8Cf4smDFzbu2tp37uiaSzXLmdc5S7d4LOi4zLGe5efyErOzti0/4uq4HlPJ9XdHxitNBu0dF3Pp4vGbV/AawqXs8Ky4JXN2HfJZfyk7PCt+6czDeuf1ffLLz5MbDd48NkgYdEhuMvKQd/zhg8dvX6FXtZpWjwZf5rwsTBa2WdV6X97YmrZoKt3e8HDNmo0P7tzaeG/dmnU6xWIaDLXGpW8NKFqv0+Cpy4Ys7dHz/ZT/nTI75XpPDKTk2T4X8hKzs7YuP6J3Wd+nsMxsS7Mhe0fGXDx/7NY1AHiI24VyD2dVfjFmcpEOv2XLP4pfatnUEWzU61/V/yz+p1tWy15P0jR8vqg87d9GyrZl65/F/5Mtqx+0MxbxGqfEaCaJb9kpphItvmenOZKdok604Q5VxPesHWDPgp3SjEIazn8xv4xfpIqfQY+q6BItCBQnSiAN2MghjbRgNilSjfOkRFnepU1oAsJZGyMEjR4E4k8gMQSShC8+aPjgSQyeaHgTTgSJRHUAA3wam+juZjShKU1oGJ1qSgM0ehNOOP6EMO0a3QknigiPRSmBDDWMRgwmAt+cxnA8+U+iGYYv/sQSgidRNKURVmmvoV0ZTnexu8ivakiNwa3ShNZR+BJF9AosbYapoOx+N8UQQTsa05h4K9cITyKERm8C8KXR7nL+NCZE0LxBSrR6OZrGDKAv3enJIIbT86SURoJuvOB1bj/8MAEA=',
                'base64'
              )
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=mem8YaGs126MiZpBA-U1UY8WNKoJasv0-94&skey=62c1cbfccc78b4b2&v=v15',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: Buffer.from(
                'd09GRgABAAAAAA4oABEAAAAAEtwAAQABAAAAAAAAAAAAAAAAAAAAAAAAAABHREVGAAABgAAAABYAAAAWABAACUdQT1MAAAGYAAAAEAAAABAAGQAMR1NVQgAAAagAAAAaAAAAGmyMdIVPUy8yAAABxAAAAGAAAABgfi0g3mNtYXAAAAIkAAAAVAAAAFQBewGeY3Z0IAAAAngAAABZAAAAog9NGKRmcGdtAAAC1AAABKkAAAe0fmG2EWdhc3AAAAeAAAAAEAAAABAAFQAjZ2x5ZgAAB5AAAAPQAAAEpPGsCHNoZWFkAAALYAAAADYAAAA2ArpjcGhoZWEAAAuYAAAAJAAAACQNzAXZaG10eAAAC7wAAAAkAAAAJCuPBNhsb2NhAAAL4AAAABQAAAAUBQMGFG1heHAAAAv0AAAAIAAAACABogIKbmFtZQAADBQAAAD7AAAB2iY6QdZwb3N0AAANEAAAACAAAAAg/2kAZnByZXAAAA0wAAAA+AAAAQlDt5akAAEAAAAMAAAAAAAAAAIAAQAAAAgAAQAAAAEAAAAKAAwADgAAAAAAAAABAAAACgAWABgAAWxhdG4ACAAAAAAAAAAAAAAAAwS2AZAABQAABZoFMwAAAR8FmgUzAAAD0QBmAfEIAgILBgYDBQQCAgSAAAAnAAAAQwAAAAAAAAAAMUFTQwBAACAiEgYf/hQAhAiNAlggAAGfAAAAAARIBbYAAAAgAAMAAAABAAMAAQAAAAwABABIAAAADgAIAAIABgBiAGUAaABtAG8Adf//AAAAYQBlAGgAbQBvAHT///+g/57/nP+Y/5f/kwABAAAAAAAAAAAAAAAAAAB4nGMTYRBn8GPdBiRLWbexnmVAASweDCIMExkY/r8B8RDkPxEQCdQl/GfK/7f/Wv+/+rcSKCLxbw8DWYADQnUzNDLcZZjB0M/QxzCToYOhkZGfoQsATT0f/wAAAHicdVXPU9tGFN4VBgwYIlPKMNUhq27swmCXdJK2QClsbcnYddNiDDMr6EEiJmN64pRDpp3xrYxI/5cncjE55dpD/4cc2ls5Jtf0vZVNIDPVCGvf937u994uavvwIND7e+3d1s5PPz76ofl9o75d871q5Tu1tfntxjfra6tff/XlF/dXPi+XFj8rFu7JT927C3N5+87M9NTkRHZ8bDQzYnFWEsBDH0YKIl+LpC+jerkk/IWuVy75shaCiATgJ1OU9bqBZAQiFFDET3QDDkGh5ZMPLFVqqa4tuS022AalkAL+8qTo84OWxvUfngwEXJn1I7POFI0wjYLrooepiqoVPtSedmM/xBp5MjVZldXjyXKJJZNTuJzCFSzK04QvbnKzsBb99cRi2WlKizv1ow7stLTvOa4blEsNmJGeUbGqCQljVRg3IcUJlc7ORVJ6FT/v2+woXM51ZCf6WcNIhL7xiB/Hv0N+GZakB0vP/l7AnR9DSXo+LFPU5u51nub7lBxGC7YU8RuG25FX/95GogEyVrDfMFqCVQW+q116nBpyHcc1KWpxGEf9d70jKWwZJ7lcfOoj3WxHY4j+u5fnDtSeB2CHXb4eDLZe223CR61DDVahJroRIvhuSXfVcfPXNjv/p2ZIC5KDDLsu0XDeV+wIBei1dCoLduRcMLWyHIAVkubVUPPxPml6Q821eyixt822jiFTaHSkj4yfR9A7wun6hRojbZh567gyns2LtZXA2AqsqtE5ETBaRJLQ66YDzg25xLYRZt6mnysHExTzs2JNYhiK40s/HLxPuwsYQCDR9eV0EPY0KA8XKhp0zE/ur6BHFGLDTjzTTFiRpzAnK9fdpbL8k7Y2LgM3mKsCCx8PvGDFN+dK+HHopSVQLNnSl+zBu9fJQ+G8eMAessAj4/kqTlnRj3XnCdwNnQ6euydCOy6oADscSH0c0NghQ0uvHTMcgZmVPd1sy2brQK8OCkkVFC5T8D8II7WThsEBhGwhK7TljARoaCMgariQlQ38hfFCFv9sJNygNLiVDaG5w4bWWAYsCf/YG9iRfCvoKI1TtT6MNkYixqnWHTdw06dcslAtBonRI0uk1ocqvKZQkcX5rNYNRFwu0NALLY9lILsC1I6mvRE9huUBGYbzQa/2bkk3yEKamIvqoUBkQm3ZuUkubBv5Wqx/oG4M1SLOymY7puByEJBh5Q1gNMJqNe+Yu4AOtMS7V9h4pM2BjhOl6DB31ymIbHRi2dYbxhrvk9+cZ5RrljV5c69SLuHVVkkkP2slip+1D/SlzZg429MXFreqYSVI7qFOXwrGlEEtQgkkQZBAkXZRyBp751Ix1jPajAGM/LjPmcGyQ4yzx30rxew0UdEkUsxCTSbVqKF1BrFsivUMZp6EEWVqclRl1YTKWdOWk3CCLhB5yRmb4OxFjk9zJ0GvXQP3eS+ZUE5q0UMLlVZ4tv8+9f6BfpFj6GZ+MVGFHhyXhS42G/+t+KJDg/Jr0I3DgA4bm8fW4MuBy01sk9zEQsZyMCmPKzAlK4RvEb6V4mOEj+OI8nmO7j3s/Q5wmoBD7eKRFJ/86cT2FXUqwEsltv8p/wcp9yEpAAAAAAEAAwAIAAoADQAH//8AD3icVdRvbBNlHAfw33N3vbter+091/vTbritPdqhJYH11o3GP+2LcZuEZLAo8aZZFDQGDJGEzSXDZOFPMCi+MJBF3CYvinVMBsyExE0RByosOuJGtkgk+kZdYhYU9B325nO2zUbuRXN983zu+/3eAQVdy0v0DNMJEVgLrbl4jPfV1EQiMk/HE4jy1bTalM8Hqhq0bFXyVFm2RwMVstkkhLNJLEMmvCGTxGBiGekZbLpXw8ZovcGyRiyRluLN6caEEePqm5rMlKbieKopneZYVlU0uiPKd+T78hNUaPL1vmNj5vapl76+7AQGxwvfXtg79OrTI4Noq8S2HDzwTP/61PmvikrP6KldHLd3f2cXUHBxeYnpYRUIQS205GKCrgeD4iO0SNdF/SCqMhYwCywBsxoolg0SrJgJNJzNEnKmTHbRKCVjiSLqeoMzyF8KZzbpMVdqEnRjgjr/45/3Fl4bf0I0egs83/396MAHo6cGBphO57Zzn1zz7R3vsopztP+VM+9cW1y8/svswhwQ6X4ilZkXiLQKHs/VhgXdR9NYoNdU6z7L1nVgWQJkJQgQpgaro02WY/0f6IkBlsBMyaoa1QiqWWVZOsZyUWLr/9tZRJ47N/8q+j0TI+Njzw0PHRkOUE8eV9A6xCEv2uTc+3n31I0tJxNR+rdz7w9/DIDgIgDTQjLUwMxFAiLPe0Hzano44JVlxrJlSQDwkrbNbAm0KjG3ZexWy6q4klapYvrDvkNjpwsFXmi41D09TX1z9MgXC8VrJJlHn93U/vyVH4rp8tnsdyQVA6ycoWIsk8MNr2zQa+NrNFWVI4w/4rfs2ogUCnpBdhWEYZa2RqIxV08OP8xZcemuqk6v2Nj4vjcGTxb29Q69V3irmt/wyR6E2vmGyd7JCWr68OFPJ4pD7u/n88Uppm1gW+fkjpevzLneUos7iVeEMKzLKSHwc8BVRQTNsgWJliybXqmunBLZlARkUFTarQ1QZUkEx+x07t898eubSLz7Owr+e3kknz979qN8gYo7/zi33kbUGBJR0rnpPJi789Ot2dsLJLHa5SVqxGORthpz1ZKieH1emWbCuhCSQq12ICcFObBsrsyomnnotWzYSF49dzFGHcZGurnZVKNqFCsaJa/vCFfvfsy5OjxsvYiecq529fi5fj9G7dTxbZv/cA4WD+za4zZ2hiSQYdpAIedHUIgTRSEkqJro90u8EpTIYCTNV/k2mLJ77MpeSBa49Pzkzqh8HzDa2nfo3OnCsbDXvNR94zrTVsyQucxTuQefndi+48tZagb+A8jAIk4AAQAAAAEZ2/4nwdxfDzz1AAkIAAAAAADJNTGLAAAAANUrzNX7mv3VCaIIYgAAAAkAAgAAAAAAAAABAAAIjf2oAAAJrPua/nsJogABAAAAAAAAAAAAAAAAAAAACQTNAMEEcwBeBOcAsAR9AHME6QCwB3EAsATVAHMC0wAfBOkApAAAAAAAXACxAP4BPAGUAdUCFQJSAAEAAAAJAIoAFgBWAAUAAgAQAC8AXAAAAQ4A+AADAAF4nIWQPUoDURSFvzFRtElhZfmwNjEjVlpJDCKIgor9MI5RCJmQiYjWrsBduBHX4jL85s8iFvI4j3PPPfe8H2CTBzpE3S1gIWoesW1V8zV6vDe8wyEfDe+yy1fD19nhu+EbhKjN6XEbBU55YiKW4o2Me4JIrBNZSs6cV88rXY+qgU9xwJBY9BsWs6d6pjvXNzUnMJIvnC73pMrPmTHgSi2TBW7UZxRcW094di7RG+sps4/dT/SMZO1MO9FfmfmbGVYcd1YL9foW4feU/5LLNy/1HLHveqnWwM5cpHYzq/KFE7tT09MqrXAvVC449/5jLs0fV781YPgDfl5GMwAAAwAAAAAAAP9mAGYAAAAAAAAAAAAAAAAAAAAAAAAAAHicTYu7TsNAEEV3vE6iVGOIsIjAHvNwmu1Y+kQpTMKCeJiR4kRKRU9hU0ODlCaIlq/wustf8CEUfIJxqDjF1T26uqPP7tEk4ghCpolkCgHDYViG8toM6MpoMklMg3OPY33K/V5NHbemtqzpcqpp2mw9vcstkOzq5i0B5VCWUl4kffpO4EQf86E+YF/v8Q4gexoZ8QYdwi90EGt02g4IBi34SbyIUvwI1xPw6kMLNvBRPaRKmU2nvje2e7uwsLJxus3R3dy2V1bwfDGrAN6zt/VajANjz9KZjYLM2MemeEHli3GW50ot8+JZbSlUXqj//On+8hdxO0EG==',
                'base64'
              )
            }
          }
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page/'
          )
        });
        assetGraph.on('warn', warn =>
          // FIXME: The mocked out woff and woff2 fonts from Google don't contain space.
          // Redo the mocks so we don't have to allow 'Missing glyph' here:
          expect(warn, 'to satisfy', /Missing glyph|Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            subsetPerPage: false
          })
        );
        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
        expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

        const index = assetGraph.findAssets({ fileName: 'index.html' })[0];
        const about = assetGraph.findAssets({ fileName: 'about.html' })[0];

        expect(index.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: '/subfont/Open_Sans-400-0f390a1464.woff2',
            to: {
              isLoaded: true
            },
            as: 'font'
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
                  href: '/subfont/Open_Sans-400-0f390a1464.woff2',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff2',
                    extension: '.woff2'
                  }
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff'
                  }
                }
              ]
            }
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: {
              isLoaded: true
            }
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com'
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com'
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true }
          },
          {
            type: 'HtmlAnchor',
            href: 'about.html'
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
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
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
          }
        ]);

        const sharedFontStyles = index.outgoingRelations[2].to;
        const sharedFont = index.outgoingRelations[0].to;

        expect(about.outgoingRelations, 'to satisfy', [
          {
            type: 'HtmlPreloadLink',
            hrefType: 'rootRelative',
            href: '/subfont/Open_Sans-400-0f390a1464.woff2',
            to: sharedFont,
            as: 'font'
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
                  href: '/subfont/Open_Sans-400-0f390a1464.woff2',
                  to: sharedFont
                },

                {
                  type: 'JavaScriptStaticUrl',
                  hrefType: 'rootRelative',
                  to: {
                    isLoaded: true,
                    contentType: 'font/woff',
                    extension: '.woff'
                  }
                }
              ]
            }
          },
          {
            type: 'HtmlStyle',
            href: expect
              .it('to begin with', '/subfont/fonts-')
              .and('to end with', '.css')
              .and('to match', /[a-z0-9]{10}/),
            to: sharedFontStyles
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.googleapis.com'
          },
          {
            type: 'HtmlPreconnectLink',
            hrefType: 'absolute',
            href: 'https://fonts.gstatic.com'
          },
          {
            type: 'HtmlStyle',
            to: { isInline: true }
          },
          {
            type: 'HtmlAnchor',
            href: 'index.html'
          },
          {
            type: 'HtmlScript',
            to: {
              isInline: true,
              outgoingRelations: [
                {
                  type: 'JavaScriptStaticUrl',
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
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
                  href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                }
              ]
            }
          }
        ]);
      });
    });

    describe('fontDisplay option', function() {
      it('should not add a font-display property when no fontDisplay is defined', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          )
        });
        assetGraph.on('warn', warn =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false
          })
        );
        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/
        })[0];

        expect(cssAsset.text, 'not to contain', 'font-display');
      });

      it('should not add a font-display property when an invalid font-display value is provided', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          )
        });
        assetGraph.on('warn', warn =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            fontDisplay: 'foo'
          })
        );
        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/
        })[0];

        expect(cssAsset.text, 'not to contain', 'font-display');
      });

      it('should add a font-display property', async function() {
        httpception(defaultGoogleFontSubsetMock);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          )
        });
        assetGraph.on('warn', warn =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            fontDisplay: 'block'
          })
        );
        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/
        })[0];

        expect(cssAsset.text, 'to contain', '@font-face{font-display:block');
      });

      it('should update an existing font-display property', async function() {
        httpception([
          {
            request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                '  font-display: swap;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=OpenSans:400) format('woff');",
                '}'
              ].join('\n')
            }
          },

          {
            request: 'GET https://fonts.gstatic.com/l/font?kit=OpenSans:400',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.woff'
                )
              )
            }
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff2',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                '  font-display: swap;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2) format('woff2');",
                '}'
              ].join('\n')
            }
          },

          {
            request:
              'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff',
            response: {
              headers: {
                'Content-Type': 'text/css'
              },
              body: [
                '@font-face {',
                "  font-family: 'Open Sans';",
                '  font-style: normal;',
                '  font-weight: 400;',
                '  font-display: swap;',
                "  src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff) format('woff');",
                '}'
              ].join('\n')
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2',
            response: {
              headers: {
                'Content-Type': 'font/woff2'
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.woff'
                )
              )
            }
          },
          {
            request:
              'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff',
            response: {
              headers: {
                'Content-Type': 'font/woff'
              },
              body: fs.readFileSync(
                pathModule.resolve(
                  __dirname,
                  '../testdata/subsetFonts/OpenSans-400.woff'
                )
              )
            }
          }
        ]);

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/html-link/'
          )
        });
        assetGraph.on('warn', warn =>
          expect(warn, 'to satisfy', /Cannot find module/)
        );
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.queue(
          subsetFontsWithoutFontTools({
            inlineSubsets: false,
            fontDisplay: 'fallback'
          })
        );

        const cssAsset = assetGraph.findAssets({
          type: 'Css',
          fileName: /fonts-/
        })[0];
        expect(cssAsset.text, 'to contain', 'font-display:fallback;');
      });
    });
  });

  describe('with fonttools installed', function() {
    it('should emit no warning about font subsetting tool not being available', async function() {
      httpception();

      const warnings = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      assetGraph.on('warn', function(warning) {
        warnings.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      expect(warnings, 'to satisfy', []);
    });

    it('should error out on multiple @font-face declarations with the same family/weight/style/stretch', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/woff2-original/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await expect(
        assetGraph.subsetFonts(),
        'to be rejected with',
        'subsetFonts transform: Multiple @font-face with the same font-family/font-style/font-weight (maybe with different unicode-range?) is not supported yet: Roboto Slab/normal/300'
      );
    });

    it('should emit a warning when subsetting invalid fonts', async function() {
      httpception();

      const warnings = [];

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-invalid/'
        )
      });
      assetGraph.on('warn', function(warning) {
        warnings.push(warning);
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.subsetFonts({
        inlineCss: true
      });
      expect(warnings, 'to satisfy', [
        expect
          .it('to be an', Error)
          .and('to have message', 'Not a TrueType or OpenType font')
          .and('to satisfy', {
            asset: expect.it('to be an', 'AssetGraph.asset')
          }),
        expect
          .it('to be an', Error)
          .and('to have message', 'Not a TrueType or OpenType font')
          .and('to satisfy', {
            asset: expect.it('to be an', 'AssetGraph.asset')
          })
      ]);

      expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

      const index = assetGraph.findAssets({ fileName: 'index.html' })[0];

      expect(index.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: '/OpenSans.ttf',
          to: {
            isLoaded: true
          },
          as: 'font',
          contentType: 'font/ttf'
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
                  isLoaded: true
                }
              }
            ]
          }
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
                  isLoaded: true
                }
              }
            ]
          }
        }
      ]);
    });

    it('should emit a warning about if the highest prioritized font-family is missing glyphs', async function() {
      httpception();

      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/missing-glyphs/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      expect(warnSpy, 'to have calls satisfying', function() {
        warnSpy({
          message: expect
            .it('to contain', 'Missing glyph fallback detected')
            .and('to contain', '\\u{4e2d} (中)')
            .and('to contain', '\\u{56fd} (国)')
        });
      });
    });

    it('should check for missing glyphs in any subset format', async function() {
      httpception();

      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/missing-glyphs/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false,
        formats: [`woff2`]
      });

      expect(warnSpy, 'to have calls satisfying', function() {
        warnSpy({
          message: expect
            .it('to contain', 'Missing glyph fallback detected')
            .and('to contain', '\\u{4e2d} (中)')
            .and('to contain', '\\u{56fd} (国)')
        });
      });
    });

    // Some fonts don't contain these, but browsers don't seem to mind, so the warnings would just be noise
    it('should not warn about tab and newline missing from the font being subset', async function() {
      httpception();

      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/missing-tab-and-newline-glyphs/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      expect(warnSpy, 'was not called');
    });

    it('should subset local fonts', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.subsetFonts({
        inlineSubsets: false
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
            isLoaded: true
          },
          as: 'font',
          contentType: 'font/woff2'
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
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  isLoaded: true
                }
              },
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/Open_Sans-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true
                }
              }
            ]
          }
        },
        {
          type: 'HtmlStyle',
          to: {
            isLoaded: true,
            isInline: true
          }
        },
        // Fallback loaders:
        {
          type: 'HtmlScript',
          hrefType: 'inline',
          to: { outgoingRelations: [{ type: 'JavaScriptStaticUrl' }] }
        },
        { type: 'HtmlNoscript', hrefType: 'inline' }
      ]);
    });

    it('should add a script that async loads a CSS with the original @font-face declarations right before </body>', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.subsetFonts({
        inlineSubsets: false
      });
      const originalInlineStylesheet = assetGraph.findAssets({
        type: 'Css',
        isInline: true
      })[0];
      // Check that the original @font-face was removed from the inline stylesheet:
      expect(originalInlineStylesheet.text, 'not to contain', '@font-face');
      const fallbackCss = assetGraph.findAssets({
        fileName: { $regex: /^fallback-.*\.css/ }
      })[0];
      expect(
        htmlAsset.text,
        'to contain',
        `<script>(function(){var el=document.createElement('link');el.href='/subfont/${
          fallbackCss.fileName
        }'.toString('url');el.rel='stylesheet';document.body.appendChild(el)}())</script><noscript><link rel="stylesheet" href="/subfont/${
          fallbackCss.fileName
        }"></noscript></body></html>`
      );
      expect(
        fallbackCss.text,
        'to equal',
        '@font-face{font-family:Open Sans;font-style:normal;font-weight:400;src:local("Open Sans Regular"),local("OpenSans-Regular"),url(/OpenSans.ttf) format("truetype")}'
      );
      const originalFontFaceLoadingScript = assetGraph.findAssets({
        type: 'JavaScript',
        isInline: true,
        text: { $regex: /createElement/ }
      })[0];
      expect(
        originalFontFaceLoadingScript.text,
        'to contain',
        `el.href='/subfont/${fallbackCss.fileName}'`
      );
      expect(assetGraph, 'to contain relation', {
        from: originalFontFaceLoadingScript,
        to: { type: 'Css' }
      });
    });

    describe('when the stylesheet containing the original @font-face declarations did not contain anything else', function() {
      it('should be removed', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/local-with-no-css-rules-in-font-face-stylesheet/'
          )
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.subsetFonts({
          inlineSubsets: false
        });
        expect(htmlAsset.text, 'not to contain', '<style>');
      });
    });

    describe('with unused variants', function() {
      it('should provide a @font-face declaration for the __subset version of an unused variant', async function() {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.subsetFonts({
          inlineSubsets: false,
          inlineCss: true
        });
        const subfontCss = assetGraph.findAssets({
          type: 'Css',
          isInline: true,
          text: { $regex: /KFOjCnqEu92Fr1Mu51TzBic6CsI/ }
        })[0];

        expect(
          subfontCss.text,
          'to contain',
          "font-family:Roboto__subset;font-stretch:normal;font-style:italic;font-weight:700;src:url(/KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format('woff')"
        );
        expect(assetGraph, 'to contain relation', {
          from: subfontCss,
          to: {
            url: `${assetGraph.root}KFOjCnqEu92Fr1Mu51TzBic6CsI.woff`
          }
        });
      });

      describe('with inlineCss:false', function() {
        it('should put the @font-face declarations for the unused variants in the main subfont CSS rather than a separate one after the JS preload script', async function() {
          httpception();

          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../testdata/subsetFonts/unused-variant/'
            )
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.populate();
          await assetGraph.subsetFonts({
            inlineSubsets: false,
            inlineCss: false
          });
          const subfontCss = assetGraph.findAssets({
            type: 'Css',
            path: '/subfont/'
          })[0];

          expect(
            subfontCss.text,
            'to contain',
            'font-family:Roboto__subset;font-stretch:normal;font-style:italic;font-weight:700;src:url(/KFOjCnqEu92Fr1Mu51TzBic6CsI.woff) format("woff")'
          );
          expect(assetGraph, 'to contain relation', {
            from: subfontCss,
            to: {
              url: `${assetGraph.root}KFOjCnqEu92Fr1Mu51TzBic6CsI.woff`
            }
          });

          // Make sure that the extra stylesheet doesn't get generated in inlineCss:false mode:
          expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
        });
      });

      it('should not provide a @font-face declaration for the __subset version of an unused variant that did not get any subsets created', async function() {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-font/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.subsetFonts({
          inlineSubsets: false
        });

        const subfontCss = assetGraph.findAssets({
          type: 'Css',
          path: '/subfont/'
        })[0];

        expect(subfontCss.text, 'not to contain', 'unused__subset');
        expect(assetGraph, 'to contain no relation', {
          from: subfontCss,
          to: {
            url: `${assetGraph.root}subfont/Roboto-700i-846d1890ae.woff`
          }
        });
      });

      it('should not move any of the original fonts to /subfont/', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/unused-variant-on-one-page/'
          )
        });
        await assetGraph.loadAssets('index*.html');
        await assetGraph.populate();
        await assetGraph.subsetFonts({
          inlineSubsets: false
        });

        expect(assetGraph, 'to contain asset', {
          url: `${assetGraph.root}IBMPlexSans-Regular.woff`
        }).and('to contain asset', {
          url: `${assetGraph.root}IBMPlexSans-Italic.woff`
        });
      });
    });

    it('should return a fontInfo object with defaulted/normalized props', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-face-defaults-and-casing/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await assetGraph.subsetFonts({
        inlineSubsets: false
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
                src: "url(OpenSans.ttf) format('truetype')"
              }
            },
            {
              texts: ['Hello, yourself!'],
              props: {
                'font-family': 'BAR',
                'font-style': 'ITAlic',
                'font-weight': 'normal',
                'font-stretch': 'normal',
                src: "url(OpenSans2.ttf) format('truetype')"
              }
            }
          ]
        }
      ]);
    });

    it('should support multiple @font-face blocks with different font-family, but same src', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/multiple-font-face-with-same-src/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Hello, world!', 'Hello, yourself!'],
              props: { 'font-family': 'foo' }
            }
          ]
        }
      ]);

      const htmlAsset = assetGraph.findAssets({
        type: 'Html'
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

    it('should tolerate case differences in font-family', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-font-family-case-difference/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Hello, world!', 'Hello, yourself!'],
              props: { 'font-family': 'Open Sans' }
            }
          ]
        }
      ]);
      expect(
        assetGraph.findAssets({ type: 'Css' })[0].text,
        'to contain',
        "font-family: 'Open Sans__subset', oPeN sAnS;"
      ).and('to contain', "--the-font: 'Open Sans__subset', OpEn SaNs;");
    });

    it('should handle HTML <link rel=stylesheet> with Google Fonts', async function() {
      httpception(defaultLocalSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/html-link/'
        )
      });
      // FIXME: Maybe use a font that's not missing any chars?
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /is missing these characters/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
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
            isLoaded: true
          },
          as: 'font'
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
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect.it('to contain', 'Open Sans__subset')
          }
        },
        {
          type: 'HtmlScript',
          to: {
            isInline: true,
            outgoingRelations: [
              {
                type: 'JavaScriptStaticUrl',
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
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
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
        }
      ]);
    });

    it('should assume font-weight:normal and font-style:normal when not explicitly mentioned in the @font-face block', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/font-weight-and-style-omitted/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const { fontInfo } = await assetGraph.subsetFonts({
        inlineSubsets: false
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
                'font-family': 'Open Sans'
              }
            }
          ]
        }
      ]);
    });

    describe('when multiple pages contain the same subsets', function() {
      // https://github.com/Munter/subfont/issues/50
      it('should link to and preload the same subset files rather than creating two copies', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/multi-page-same-subset/'
          )
        });
        const [htmlAsset1, htmlAsset2] = await assetGraph.loadAssets(
          'index*.html'
        );
        await assetGraph.populate({
          followRelations: {
            crossorigin: false
          }
        });
        await assetGraph.subsetFonts({
          inlineSubsets: false
        });
        const preloads1 = htmlAsset1.outgoingRelations.filter(
          relation => relation.type === 'HtmlPreloadLink'
        );
        const preloads2 = htmlAsset2.outgoingRelations.filter(
          relation => relation.type === 'HtmlPreloadLink'
        );
        expect(preloads1, 'to have length', 1);
        expect(preloads2, 'to have length', 1);
        expect(preloads1[0].to, 'to be', preloads2[0].to);

        const regularSubsetFonts = assetGraph.findAssets({
          fileName: { $regex: /^IBM_Plex_Sans-400-/ },
          extension: '.woff2'
        });
        // Assert the absence of a -1.woff duplicate:
        expect(regularSubsetFonts, 'to have length', 1);

        expect(htmlAsset1.text, 'to equal', htmlAsset2.text);
      });
    });

    it('should handle mixed local fonts and Google fonts', async function() {
      httpception(defaultLocalSubsetMock);

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-mixed/'
        )
      });
      // FIXME: Maybe use a font that's not missing any chars?
      assetGraph.on('warn', warn =>
        expect(warn, 'to satisfy', /is missing these characters/)
      );
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
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
            isLoaded: true
          },
          as: 'font'
        },
        {
          type: 'HtmlPreloadLink',
          hrefType: 'rootRelative',
          href: expect
            .it('to begin with', '/subfont/Open_Sans-400-')
            .and('to end with', '.woff2')
            .and('to match', /[a-z0-9]{10}/),
          to: {
            isLoaded: true
          },
          as: 'font'
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
                  extension: '.woff2'
                }
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
                  extension: '.woff'
                }
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
                  extension: '.woff2'
                }
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
                  extension: '.woff'
                }
              }
            ]
          }
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
                  extension: '.woff2'
                }
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  fileName: expect.it('to begin with', 'Local_Sans-400-'),
                  extension: '.woff'
                }
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff2',
                  fileName: expect.it('to begin with', 'Open_Sans-400-'),
                  extension: '.woff2'
                }
              },

              {
                type: 'CssFontFaceSrc',
                hrefType: 'rootRelative',
                to: {
                  contentType: 'font/woff',
                  fileName: expect.it('to begin with', 'Open_Sans-400-'),
                  extension: '.woff'
                }
              }
            ]
          }
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.googleapis.com'
        },
        {
          type: 'HtmlPreconnectLink',
          hrefType: 'absolute',
          href: 'https://fonts.gstatic.com'
        },
        {
          type: 'HtmlStyle',
          to: {
            isInline: true,
            text: expect
              .it('to contain', 'Open Sans__subset')
              .and('to contain', 'Local Sans__subset')
          }
        },
        // Self-hosted fallback loaders:
        {
          type: 'HtmlScript',
          hrefType: 'inline',
          to: { outgoingRelations: [{ type: 'JavaScriptStaticUrl' }] }
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
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
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
                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
              }
            ]
          }
        }
      ]);
    });

    describe('with a variable font defined in a @supports block and a non-variable fallback', function() {
      it('should subset both the variable font and the fallback font', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-in-supports-block-with-fallback/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await assetGraph.subsetFonts({
          inlineSubsets: false
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
                  'font-family': 'Venn VF'
                }
              },
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': 'normal',
                  'font-style': 'normal',
                  'font-family': 'Venn'
                }
              }
            ]
          }
        ]);

        expect(
          assetGraph.findAssets({ type: 'Css' })[0].text,
          'to contain',
          `font-family: 'Venn VF__subset', 'Venn VF', Venn__subset, 'Venn', sans-serif;`
        );
      });
    });

    describe('with a variable font defined in a @supports block and a non-variable fallback with two variants', function() {
      it('should subset both the variable font and the fallback font', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/variable-font-in-supports-block-with-two-fallback-variants/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await assetGraph.subsetFonts({
          inlineSubsets: false
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
                  'font-family': 'Venn VF'
                }
              },
              {
                text: 'dlorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '700',
                  'font-style': 'normal',
                  'font-family': 'Venn'
                }
              },
              {
                text: ' !,Helo',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '400',
                  'font-style': 'normal',
                  'font-family': 'Venn'
                }
              }
            ]
          }
        ]);
        const preloadFallbackJavaScript = assetGraph.findAssets({
          type: 'JavaScript'
        })[0];
        expect(
          preloadFallbackJavaScript.text,
          'to contain',
          "{'font-weight':'300 800'}"
        );
        expect(assetGraph, 'to contain asset', {
          fileName: {
            $regex: '^Venn_VF-300_800-[a-f0-9]+.woff2'
          }
        });
      });
    });

    describe('with two variable fonts that provide different font-weight ranges of the same font-family', function() {
      it('should subset both fonts when a CSS animation sweeps over both ranges', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/two-variable-fonts-animated/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        const { fontInfo } = await assetGraph.subsetFonts({
          inlineSubsets: false
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
                  'font-family': 'Venn VF'
                }
              },
              {
                text: ' !,Hdelorw',
                props: {
                  'font-stretch': 'normal',
                  'font-weight': '501 900',
                  'font-style': 'normal',
                  'font-family': 'Venn VF'
                }
              }
            ]
          }
        ]);
      });
    });

    describe('with omitFallbacks:true', function() {
      it('should remove the original @font-face declarations and references to them, and not make subsets of unused variants', async function() {
        httpception();

        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../testdata/subsetFonts/no-fallbacks/'
          )
        });
        const [htmlAsset] = await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.subsetFonts({
          inlineSubsets: false,
          omitFallbacks: true
        });

        expect(htmlAsset.text, 'to contain', 'font-family: Roboto__subset;')
          .and('to contain', 'font: 14px Roboto__subset, serif;')
          .and('not to contain', 'font-family: Roboto;')
          .and('not to contain', "font-family: 'Roboto';")
          .and('not to contain', "font-family: 'font-style: italic;");

        expect(assetGraph, 'to contain no asset', {
          fileName: 'KFOmCnqEu92Fr1Mu4mxM.woff'
        });

        const cssAsset = assetGraph.findAssets({
          fileName: { $regex: /^fonts-.*\.css$/ }
        })[0];
        expect(cssAsset.text, 'not to contain', 'font-style:italic');
      });
    });

    it('should accept a Map of existing traces', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/local-single/'
        )
      });
      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      const tracesByAsset = new Map();
      tracesByAsset.set(htmlAsset, [
        {
          text: 'Something that it does not actually say on the page',
          props: {
            'font-family': "'Open Sans'",
            'font-style': 'normal',
            'font-weight': 'bold'
          }
        }
      ]);
      await assetGraph.populate();
      const { fontInfo } = await assetGraph.subsetFonts({
        inlineSubsets: false,
        tracesByAsset
      });
      expect(fontInfo, 'to satisfy', [
        {
          fontUsages: [
            {
              texts: ['Something that it does not actually say on the page'],
              pageText: ' Sacdeghilmnopstuy',
              text: ' Sacdeghilmnopstuy',
              props: {
                'font-stretch': 'normal',
                'font-weight': '400',
                'font-style': 'normal',
                'font-family': 'Open Sans',
                src:
                  "local('Open Sans Regular'), local('OpenSans-Regular'), url(OpenSans.ttf) format('truetype')"
              }
            }
          ]
        }
      ]);
    });
  });

  describe('with non-truetype fonts in the mix', function() {
    it('should not attempt to subset non-truetype fonts', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/non-truetype-font/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.subsetFonts({
        inlineSubsets: false
      });

      const html = assetGraph.findAssets({ type: 'Html' })[0];

      expect(html.outgoingRelations, 'to satisfy', [
        {
          type: 'HtmlStyle',
          to: {
            outgoingRelations: [
              {
                type: 'CssFontFaceSrc',
                href: 'one.eot'
              },
              {
                type: 'CssFontFaceSrc',
                href: 'two.eot?#iefix'
              },
              {
                type: 'CssFontFaceSrc',
                href: 'three.svg#icomoon'
              }
            ]
          }
        },
        { type: 'HtmlStyleAttribute' },
        { type: 'HtmlStyleAttribute' },
        { type: 'HtmlStyleAttribute' }
      ]);
    });

    it('should only subset truetype fonts despite non-truetype in the same declaration', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/subsetFonts/non-truetype-and-truetype/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate({
        followRelations: {
          crossorigin: false
        }
      });
      await assetGraph.subsetFonts({
        inlineSubsets: false
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
            isLoaded: true
          },
          as: 'font',
          contentType: 'font/woff2'
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
                  extension: '.woff2'
                }
              },

              {
                type: 'JavaScriptStaticUrl',
                hrefType: 'rootRelative',
                to: {
                  isLoaded: true,
                  contentType: 'font/woff',
                  extension: '.woff'
                }
              }
            ]
          }
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
                  isLoaded: true
                }
              },
              {
                hrefType: 'rootRelative',
                href: expect
                  .it('to begin with', '/subfont/icomoon-400-')
                  .and('to match', /-[0-9a-f]{10}\./)
                  .and('to end with', '.woff'),
                to: {
                  isLoaded: true
                }
              }
            ]
          }
        },
        {
          type: 'HtmlStyleAttribute',
          to: {
            text: expect.it('to contain', 'icomoon__subset')
          }
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
                      to: { isLoaded: true }
                    },
                    {
                      href: '/icomoon.eot?#iefix',
                      to: { isLoaded: true }
                    },
                    {
                      href: '/icomoon.woff',
                      to: { isLoaded: true }
                    },
                    {
                      href: '/icomoon.ttf',
                      to: { isLoaded: true }
                    },
                    {
                      href: '/icomoon.svg#icomoon',
                      to: { isLoaded: true }
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          type: 'HtmlNoscript',
          hrefType: 'inline'
        }
      ]);
    });
  });
});
