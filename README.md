subfont
=======

A command line tool to statically analyse your page in order to generate the most optimal web font subsets, then inject them into your page.

Speed up your time to first meaningful paint by reducing the web font payload and critical path to the font files.

Subfont will:
- Automatically figure out what characters are used from each font
- Create an exact subset of used characters of each font
- Add the font subsets to your pages with browser preload hints for reduced time to first meaningful paint
- Give the subsetted fonts new names and prepend them in front of the original fonts in your `font-family` definitions (enables missing glyph fallback)
- Async load your original `@font-face` declaring CSS at the bottom of your page, moving it off the critical path

![A site before and after running subfont](https://raw.githubusercontent.com/Munter/subfont/master/images/before-after.png)

Currently supported font services:
- Google fonts


Installation
-----

```
npm install -g subfont
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
$ subfont -h
Create optimal font subsets from your actual font usage.
subfont [options] <htmlFile(s) | url(s)>

Options:
  -h, --help        Show this help                      [default: false]
  --root            Path to your web root (will be deduced from your
                    input files if not specified)
  -o, --output      Directory where results should be written to
  -i, --in-place    Modify HTML-files in-place. Only use on build
                    artifacts                           [default: false]
  --inline-subsets  Inline fonts as data-URIs inside the @font-face
                    declaration                         [default: false]
  --format          Webfont format. Available options are `woff` and
                    `woff2`                            [default: "woff"]
  -d, --debug       Verbose insigts into font glyph detection
                                                        [default: false]
```

License
-------

MIT
