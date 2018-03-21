subfont
=======

[![NPM version](https://badge.fury.io/js/subfont.svg)](http://badge.fury.io/js/subfont)
[![Build Status](https://travis-ci.org/Munter/subfont.svg?branch=master)](https://travis-ci.org/Munter/subfont)
[![Coverage Status](https://img.shields.io/coveralls/Munter/subfont.svg)](https://coveralls.io/r/Munter/subfont?branch=master)
[![Dependency Status](https://david-dm.org/Munter/subfont.svg)](https://david-dm.org/Munter/subfont)

A command line tool to statically analyse your page in order to generate the most optimal web font subsets, then inject them into your page.

Speed up your time to first meaningful paint by reducing the web font payload and critical path to the font files.

Subfont will:

- Automatically figure out what characters are used from each font
- Warn you about usage of characters that don't exist as glyphs in your webfonts
- Create an exact subset of used characters of each font
- Generate web fonts in both `woff2` and `woff` formats
- Add preload hints for the subsets to reduce time to first meaningful paint
- Add JS font loading for browsers without preload support
- Give the subsetted fonts new names and prepend them in front of the original fonts in your `font-family` definitions (enables missing glyph fallback)
- Async load your original `@font-face` declaring CSS at the bottom of your page, moving it off the critical path

![A site before and after running subfont](https://raw.githubusercontent.com/Munter/subfont/master/images/before-after.png)

Currently supported font services:

- Google fonts
- Local fonts (with [fonttools](https://github.com/fonttools/fonttools))

**If you know of font services with liberal font usage licenses, open an issue and we'll add support for them**


Installation
-----

Get the basic CLI tool, which supports subsetting Google Fonts and optimizing all local fonts with preloading instructions:

```
npm install -g subfont
```

If you want the ability to run font subsetting locally you'l need Python and install fonttools with this command line:

```
pip install fonttools brotli zopfli
```


Recommended usage
-----------------

Run subfont on the files you are ready to deploy to a static file hosting service. If these are build artifacts from another build system, and not the original files, run `subfont path/to/artifacts/index.html -i` to have `subfont` clobber the dist files in their original location.

If you want to run directly against your raw original files, it is recommended to create a recursive copy of your files which you run `subfont` on. This keeps your original authoring abstraction unchanged.


Other usages
------------

You can have subfont output a copy of your input files to a new directory. This uses [Assetgraph](https://github.com/assetgraph/assetgraph) to trace a dependency graph of your website and writes it to your specified output directory. Be aware of any errors or warnings that might indicate Assetgraph having problems with your code, and be sure to double check that the expected files are in the output directory. Run `subfont path/to/index.html -o path/to/outputDir`.


You can also have subfont scrape a website directly using http and write the output to local disk. This use is likely to fail in a number of ways and should mostly considered a demo feature if you just want to give the tool a quick go to see what it will do to your page. Run `subfont https://yourpage.me -o path/to/outputDir`.


Command line options
--------------------

```
$ bin/subfont -h
Create optimal font subsets from your actual font usage.
subfont [options] <htmlFile(s) | url(s)>

Options:
  -h, --help       Show this help                       [default: false]
  --root           Path to your web root (will be deduced from your
                   input files if not specified)
  -o, --output     Directory where results should be written to
  -i, --in-place   Modify HTML-files in-place. Only use on build
                   artifacts                            [default: false]
  --inline-fonts   Inline fonts as data-URIs inside the @font-face
                   declaration                          [default: false]
  --inline-css     Inline CSS that declares the @font-face for the
                   subset fonts                         [default: false]
  --font-display   Injects a font-display value into the @font-face
                   CSS. Valid values: auto, block, swap, fallback,
                   optional                            [default: "swap"]
  --recursive, -r  Crawl all HTML-pages linked with relative and root
                   relative links. This stays inside your domain
                                                         [default: true]
  -d, --debug      Verbose insigts into font glyph detection
                                                        [default: false]
```

Other great font tools
----------------------
https://meowni.ca/font-style-matcher/


License
-------

MIT
