SFNT to WOFF / WOFF to SFNT Converter
====================
Node.js font converter capable of converting SFNT ([TrueType](https://en.wikipedia.org/wiki/TrueType), [OpenType](https://en.wikipedia.org/wiki/OpenType)) font files to [WOFF](https://en.wikipedia.org/wiki/Web_Open_Font_Format)


Usage
----------
To convert fonts from **woff2sfnt** invoke the script from the command line:

    woff2sfn.js input.ttf output.woff

To convert fonts from sfnt2woff invoke the script from the command line:

    sfnt2woff.js input.woff output.otf


Dependencies
------------
[pako](https://github.com/nodeca/pako)

License
-----------------
MIT License

TODO
--------
Implement a decoder/encoder for [WOFF2](http://www.w3.org/TR/WOFF2/)

Implement a support for Metadata and Privatedata blocks
