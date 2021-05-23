### v6.1.0 (2021-05-23)

- [Remove the JavaScript-based preload polyfill](https://github.com/Munter/subfont/commit/b58bc351d8002d2aae1f4f9cf82126a3efcb997e) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Fix assertion name](https://github.com/Munter/subfont/commit/f3838a8ab6edef0db84ba17552e8c42967d8e6dc) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Add some fuzziness to a Google Web Fonts test so it doesn't break when they return a slightly smaller font](https://github.com/Munter/subfont/commit/b7889e4855704f08cc47cf14794a43bdb4f75aed) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v6.0.2 (2021-05-18)

#### Pull requests

- [#143](https://github.com/Munter/subfont/pull/143) Remove installation instructions for fonttools ([Peter Müller](mailto:munter@fumle.dk))
- [#144](https://github.com/Munter/subfont/pull/144) Remove more fonttools cruft ([Andreas Lind](mailto:andreas.lind@workday.com))

#### Commits to master

- [Update subset-font to ^1.2.3](https://github.com/Munter/subfont/commit/10b933bab2e36c34dcb74554ad15556e4cf1be2d) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [prettier --write '\*\*\/\*.js'](https://github.com/Munter/subfont/commit/b32fdf7fbf6571a3cdf349a926bced5a68b5f44d) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Lock prettier with a ~ range](https://github.com/Munter/subfont/commit/0faa563eda950fd120b7bdffa0f56a97c34590be) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Fix test so it doesn't break if the hash of a subset font changes \(it probably changes because of the recent harfbuzzjs update\)](https://github.com/Munter/subfont/commit/3188b3d1c6cd54daf3fd34c8c32fcedc406a32e9) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v6.0.1 (2021-05-06)

#### Pull requests

- [#142](https://github.com/Munter/subfont/pull/142) Update readme ([Björn Rixman](mailto:bjorn.rixman@gmail.com))

#### Commits to master

- [Update subset-font to ^1.2.0](https://github.com/Munter/subfont/commit/9e8256e895ee02095e831ee954fc3aef1dd414fd) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update fontverter to 2.0.0](https://github.com/Munter/subfont/commit/0f65689c716eae92c4b580ab5fead12f2d524ca4) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v6.0.0 (2021-04-18)

#### Pull requests

- [#124](https://github.com/Munter/subfont/pull/124) Remove support for subsetPerPage:true ([Andreas Lind](mailto:andreas.lind@peakon.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Correct version number in error message](https://github.com/Munter/subfont/commit/c81d57cc7c1a192a1cbddf0b5416283470db8dac) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Remove more unused stuff](https://github.com/Munter/subfont/commit/98e93cfd6315c2760664aa5c890bc9b192ca362b) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Remove downloadGoogleFonts utility](https://github.com/Munter/subfont/commit/c7b4fad82a1385a81a969b95fd9a8e3569687a16) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Always use harfbuzz for subsetting, remove fonttools support](https://github.com/Munter/subfont/commit/a8c62f1982241f3a85af2eae8796df6e8321b4ca) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update subset-font to ^1.1.3](https://github.com/Munter/subfont/commit/34bfb79005931aa69fcee63468e0a12a9140e706) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v5.4.1 (2021-04-09)

- [Run the font-variant-\* test with harfbuzz also](https://github.com/Munter/subfont/commit/731f27f38a22cb8637b741db4382130b24db90ed) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update subset-font to ^1.1.0](https://github.com/Munter/subfont/commit/7e42bdefff0f57cf75710a659664adf371c95af7) ([Andreas Lind](mailto:andreas.lind@workday.com))

### v5.4.0 (2021-04-09)

#### Pull requests

- [#140](https://github.com/Munter/subfont/pull/140) Switch to the subset-font package ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#139](https://github.com/Munter/subfont/pull/139) Use the split-out fontverter module for sniffing and converting font buffers ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#137](https://github.com/Munter/subfont/pull/137) Fix `--obfuscate-names` argument ([Nico](mailto:nlemoine@users.noreply.github.com))

#### Commits to master

- [Accept up to a 0.3% difference in the reference image tests to get the missingGlyphs case to pass on CI](https://github.com/Munter/subfont/commit/3546d0289bc80cd5f3ce9ff634dbbed53cd20dfe) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Skip the test case for harfbuzz, let's fix that separately](https://github.com/Munter/subfont/commit/378a1228c77279d7be3055eb090b31e498abd925) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Add &lt;meta charset="utf-8"&gt; to the test case so the headless browser doesn't interpret it as iso-8859-1](https://github.com/Munter/subfont/commit/e65e74ac3d13e7b0b4a92b1515855f523e10debc) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update puppeteer to ^8.0.0](https://github.com/Munter/subfont/commit/3bfe400255dbeb10812ad208d3e02ef5fb760c1c) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update puppeteer-core to ^8.0.0](https://github.com/Munter/subfont/commit/3b47bed47490157e8a8ae562ae92dfcd8f644df3) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [+4 more](https://github.com/Munter/subfont/compare/v5.3.0...v5.4.0)

### v5.3.0 (2021-01-26)

- [#136](https://github.com/Munter/subfont/pull/136) Implement --relative-urls switch that makes subfont issue relative urls instead of root-relative ones ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.2.5 (2020-12-13)

- [Fix lint](https://github.com/Munter/subfont/commit/ffd3c7d99e97e801c9d9e05067c78fcdf9e77ac6) ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [Simplify test case](https://github.com/Munter/subfont/commit/9b9813421b9e9525f2d550fbc006bf7d4a034d18) ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [Rewrite JavaScript-based preload polyfill to fix \#131](https://github.com/Munter/subfont/commit/7ae214e5a7ab694a2d50fd560c1d4f554b809b1b) ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v5.2.4 (2020-12-13)

- [Use the font-family library to parse font-family property in postcss ast](https://github.com/Munter/subfont/commit/bc193279b26b14a4cf278d46afca07dfd27339c2) ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v5.2.3 (2020-12-10)

- [Fix \#130](https://github.com/Munter/subfont/commit/8b790bacd29a39681a57a52063f3a637b4860de9) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.2.2 (2020-09-14)

- [Update font-family-papandreou to ^0.2.0-patch2](https://github.com/Munter/subfont/commit/10986a08490ad3ead8f400f0db9307e1aa6047e4) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.2.1 (2020-09-01)

#### Pull requests

- [#123](https://github.com/Munter/subfont/pull/123) Respect silent:true wrt. the console output ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#126](https://github.com/Munter/subfont/pull/126) Support subfont --formats foo,bar and fix weirdness with --formats consuming further non-option arguments ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Conserve a small bit of whitespace in the generated CSS](https://github.com/Munter/subfont/commit/30217ec7c8929a5a2695bb02f934f9f1ca626022) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Remove commented out code that was accidentally committed](https://github.com/Munter/subfont/commit/492456600511843988c171c84a18c316a9f1de5c) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Reference image tests: Fix wrongly mapped inlineFonts option](https://github.com/Munter/subfont/commit/7609a248b2217105f67f59b28b2f543dcca1f39e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Whoops, put back the subfont --help line](https://github.com/Munter/subfont/commit/ae9b5938950f12611b8465cf8ac383c17bbbf7a3) ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [Don't list the --font-display values in prose alongside yargs' identical list](https://github.com/Munter/subfont/commit/19dcfcb0105b908df8dfdf936758ef10b8abef5e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+1 more](https://github.com/Munter/subfont/compare/v5.2.0...v5.2.1)

### v5.2.0 (2020-08-02)

- [#120](https://github.com/Munter/subfont/pull/120) Use browserslist to configure which font formats to supply subsets and fallbacks in, and whether to add the JS-based preload polyfill ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.1.1 (2020-07-26)

#### Pull requests

- [#121](https://github.com/Munter/subfont/pull/121) Don't crash in the reporting code when some pages don't make use of a font that's used on others ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Exclude CHANGELOG.md from being checked with prettier \(generated\)](https://github.com/Munter/subfont/commit/741b050b3ffa2ecc5fa391d49acccd575fdd49ca) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.1.0 (2020-07-26)

#### Pull requests

- [#111](https://github.com/Munter/subfont/pull/111) Implement an "ssr" mode where all subsets are made available on every page ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#116](https://github.com/Munter/subfont/pull/116) Self host fallback CSS and fonts for Google Web Fonts ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#115](https://github.com/Munter/subfont/pull/115) Only download truetype files from Google Web Fonts and convert them locally ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#56](https://github.com/Munter/subfont/pull/56) Support the harfbuzz subsetter ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#114](https://github.com/Munter/subfont/pull/114) Also report the number of code points used on each page when subsetPerPage is false ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#113](https://github.com/Munter/subfont/pull/113) Test on OSX in travis ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [prettier --write README.md](https://github.com/Munter/subfont/commit/6a0d110aefde4a8d9a581db2cdfe472ed2540f44) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Also check .md files with prettier on CI](https://github.com/Munter/subfont/commit/0bff06260ec59f4ac4bd975475d2cc6cd0229166) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update command line help in README](https://github.com/Munter/subfont/commit/b0bb351bc8aeadd0eb25fe962262df24462c3a64) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Avoid adding multiple copies of Google fonts when self-hosting them](https://github.com/Munter/subfont/commit/071fbf8a20426694bdd385b7a3205d18ede2e5c1) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Use the conversion tools introduced in \#115 when creating a subset font with harfbuzz](https://github.com/Munter/subfont/commit/7159e05b253186c58107ade3a3feafe5d55d7a35) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+9 more](https://github.com/Munter/subfont/compare/v5.0.7...v5.1.0)

### v5.0.7 (2020-07-12)

#### Pull requests

- [#105](https://github.com/Munter/subfont/pull/105) Expand test setup ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#110](https://github.com/Munter/subfont/pull/110) Don't break CSS source maps when updating the existing CSS ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#107](https://github.com/Munter/subfont/pull/107) Sort the code points numerically before converting to unicode ranges ([Andreas Lind](mailto:andreas.lind@peakon.com))

#### Commits to master

- [Fix testdata dir name](https://github.com/Munter/subfont/commit/3d11aacb8f81d8e6f14f9747fafc5aa347c05daf) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.6 (2020-07-06)

#### Pull requests

- [#104](https://github.com/Munter/subfont/pull/104) Always include the space character U+20 in subsets ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#103](https://github.com/Munter/subfont/pull/103) Inject unicode-range into all the @font-face declarations for the given family when glyphs are missing ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#102](https://github.com/Munter/subfont/pull/102) Do not preload unused variants in a self-hosting scenario ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Test in node 14](https://github.com/Munter/subfont/commit/a65d7037662a4a62e2ad4215389c2cd1dab8fa22) ([Peter Müller](mailto:munter@fumle.dk))
- [Convert mocha config to mocha 8 compatible format](https://github.com/Munter/subfont/commit/3b80329c605e47884fc797ff569e3470c6890a4e) ([Peter Müller](mailto:munter@fumle.dk))
- [Update non-breaking development dependencies](https://github.com/Munter/subfont/commit/7054f1f4e248ae57aae265f43e85f0134f88ced7) ([Peter Müller](mailto:munter@fumle.dk))
- [Avoid unhandled promise rejection errors](https://github.com/Munter/subfont/commit/8b1d0a153dbefcbb68f2441adc4aefff4b77ce20) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.5 (2020-07-04)

- [Update assetgraph to ^6.0.8](https://github.com/Munter/subfont/commit/5ad6794bc61b0c96b9fa1dea68631e78bfd1cd10) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update font-tracer to ^2.0.1](https://github.com/Munter/subfont/commit/b68be3c65b1931d9eeac456e7ea6a699975b50c7) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.4 (2020-06-30)

- [#95](https://github.com/Munter/subfont/pull/95) Warn if fetching an entry point results in an HTTP redirect ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#97](https://github.com/Munter/subfont/pull/97) Do not preload unused variants in the JavaScript-based polyfill ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#100](https://github.com/Munter/subfont/pull/100) Inject unicode-range into the original @font-face declaration when it's missing some of the glyphs that are used ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#99](https://github.com/Munter/subfont/pull/99) Avoid using bluebird ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.3 (2020-06-22)

#### Pull requests

- [#98](https://github.com/Munter/subfont/pull/98) Add directly used dependency ([Jang Whemoon](mailto:palindrom615@gmail.com))
- [#94](https://github.com/Munter/subfont/pull/94) Don't refer to the fallback CSS with an absolute url when inside the canonical root ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Remove lodash.groupby now that we have all of lodash](https://github.com/Munter/subfont/commit/3d300c718bbec111040fed1510cd4d4ae098627b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v5.0.2 (2020-05-29)

- [#93](https://github.com/Munter/subfont/pull/93) Fix: Cannot read property 'removeChild' of undefined ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v5.0.1 (2020-05-25)

#### Pull requests

- [#86](https://github.com/Munter/subfont/pull/86) Configure Renovate ([Renovate Bot](mailto:bot@renovateapp.com))

#### Commits to master

- [Update to font-snapper 1.0.2](https://github.com/Munter/subfont/commit/516e7e35a6a900b087f3fb07b602bac84176dcdc) ([Peter Müller](mailto:munter@fumle.dk))
- [Only distribute relevant files in npm package](https://github.com/Munter/subfont/commit/a49be6d575dd9e2be4fa0f6f730dd7e174d98f55) ([Peter Müller](mailto:munter@fumle.dk))

### v5.0.0 (2020-05-24)

#### Pull requests

- [#90](https://github.com/Munter/subfont/pull/90) Don't break when an unused variant points at a non-existent file ([Andreas Lind](mailto:andreas.lind@peakon.com))

#### Commits to master

- [Update to prettier 2 and reformat all files](https://github.com/Munter/subfont/commit/de6a482f31075245ed957aa8057a24e31addd612) ([Peter Müller](mailto:munter@fumle.dk))
- [Update yargs to 15.3.1](https://github.com/Munter/subfont/commit/d10b5cbe289ae86f17b749fd05b75f68b708f88e) ([Peter Müller](mailto:munter@fumle.dk))
- [Update sinon to 9.0.2](https://github.com/Munter/subfont/commit/694d30960dcc9e15b0c6b1b7a95da3459c1b4db9) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to nyc 15](https://github.com/Munter/subfont/commit/d5bb5e43c22471b863febeeafe00b2134acffff5) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to puppeteer 3.1.0](https://github.com/Munter/subfont/commit/c1109023ef26cd986800eb4e2d8063567de9492e) ([Peter Müller](mailto:munter@fumle.dk))
- [+7 more](https://github.com/Munter/subfont/compare/v4.2.2...v5.0.0)

### v4.2.2 (2020-04-11)

- [#87](https://github.com/Munter/subfont/pull/87) Fix uniq-ification of strings that might contain non-UTF-16 chars ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v4.2.1 (2020-04-05)

- [#85](https://github.com/Munter/subfont/pull/85) Don't break in --no-fallbacks mode when multiple pages share the same CSS ([Andreas Lind](mailto:andreas.lind@peakon.com), [suziwen](mailto:suziwen1@gmail.com))

### v4.2.0 (2020-02-19)

#### Pull requests

- [#76](https://github.com/Munter/subfont/pull/76) Fix the prettier setup ([Andreas Lind](mailto:andreas.lind@peakon.com))

#### Commits to master

- [Switch to the official css-font-parser now that bramstein\/css-font-parser\#7 has been merged and released](https://github.com/Munter/subfont/commit/457c7f0e4cef0a8c1bd8f816c23ace64c9987424) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't populate source map relations](https://github.com/Munter/subfont/commit/5c07218b6f1dcc6fad88702a3bcb7b33bf9df54e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.1.2 (2020-01-09)

- [#75](https://github.com/Munter/subfont/pull/75) Fix omitFallbacks with Google Web Fonts ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v4.1.1 (2020-01-04)

- [Add regression test](https://github.com/Munter/subfont/commit/46eddce9c09268dbde459b1f98fe5cec9e4c98f5) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't attempt to prefetch inlined fonts](https://github.com/Munter/subfont/commit/844e21e53b72ac7c7efe2f4c0549a71ade5d823c) ([Jesse Farebrother](mailto:jessefarebro@gmail.com))

### v4.1.0 (2020-01-03)

- [#72](https://github.com/Munter/subfont/pull/72) Add subsetPerPage & format options ([Jesse Farebrother](mailto:jessefarebro@gmail.com))

### v4.0.5 (2019-12-12)

- [Update dev dependencies](https://github.com/Munter/subfont/commit/c6ed229b05a39c5dfe21278b0b51f44050ab6efd) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 6.0.4](https://github.com/Munter/subfont/commit/d49a23a3347c1370410c17cc44283c130c108bc3) ([Peter Müller](mailto:munter@fumle.dk))
- [Add missing end paren in status message](https://github.com/Munter/subfont/commit/ff4e87cafac535fb7bdf38cd41b811bd20cc5566) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update font-tracer to ^1.3.1](https://github.com/Munter/subfont/commit/e5652edcc5ecaa2ab9f0c13a7f6de703ec0b806e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update font-tracer to ^1.3.0](https://github.com/Munter/subfont/commit/70f8292a3eba429973475b745bfd41d5f8b9b19d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.4 (2019-11-16)

#### Pull requests

- [#70](https://github.com/Munter/subfont/pull/70) getCssRules...: Add support for default XML namespaces in stylesheets ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update font-snapper to ^1.0.1](https://github.com/Munter/subfont/commit/e90ea786ead4a803a68d5d442b1d1a98474afd16) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Reference image tests: Close pages after screenshotting them](https://github.com/Munter/subfont/commit/7ae9494535c9fbcde4328aa43d98de43eddc0d01) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add vscode debugger launch configuration for the test suite](https://github.com/Munter/subfont/commit/f8f9abc42909c556765555cc49f44eb40a9194db) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Guard against an already detached relation when cleaning up](https://github.com/Munter/subfont/commit/6392fc359222772c9033a58a9020e3b35487d019) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.3 (2019-11-02)

#### Pull requests

- [#67](https://github.com/Munter/subfont/pull/67) Only warn about missing fonttools install if we are actually trying t… ([Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [Fix accidental console.log during test](https://github.com/Munter/subfont/commit/2378e0c2da6aedbdcfc88d566e55829cc1da9b6d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Avoid failing in the code that counts the savings when fonttools isn't available](https://github.com/Munter/subfont/commit/8bb72e175fec3f53b1cd88a829caac3d03ddc75d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add auto generated changelog on release](https://github.com/Munter/subfont/commit/5afe8b802d7bcda75adfc59652da891f216b4526) ([Peter Müller](mailto:munter@fumle.dk))

### v4.0.2 (2019-11-02)

#### Pull requests

- [#65](https://github.com/Munter/subfont/pull/65) Don't use the short document.fonts.forEach preload polyfill in inlineCss mode ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#66](https://github.com/Munter/subfont/pull/66) Fix early return inside for loop ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Travis: Use node 12 instead of latest, avoiding 13 which does not work yet](https://github.com/Munter/subfont/commit/4db7abcc921c56020fc835655f21c9edeaaaa19e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Remove unused function, whoops](https://github.com/Munter/subfont/commit/636a4a6fef2cd27077874c8d4a2f4d18b1b08176) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.1 (2019-10-22)

- [README: Update CLI help with the new options](https://github.com/Munter/subfont/commit/6021e1f4084e9e2481a460977839fdfafc8a292d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't list --no-recursive separately now that it's the default](https://github.com/Munter/subfont/commit/e5d0b70b483346ea1996e4a6412cf68b003412a4) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix subfont --help](https://github.com/Munter/subfont/commit/d5a1e12385eff1ee880d2419661deaa975d24293) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Lint after running the test suite](https://github.com/Munter/subfont/commit/751c87d6418a6ec42ac5920b4916d773440664fd) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.0 (2019-10-22)

#### Pull requests

- [#49](https://github.com/Munter/subfont/pull/49) Dynamic traces ([Andreas Lind](mailto:andreas.lind@peakon.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#28](https://github.com/Munter/subfont/pull/28) Make --no-recursive the default ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#61](https://github.com/Munter/subfont/pull/61) Rearrange so the main export works as a programmatic api \(instead of accepting an argv array\) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#63](https://github.com/Munter/subfont/pull/63) Update dependencies to enable Greenkeeper 🌴 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))

#### Commits to master

- [Update yargs and async-main-wrap](https://github.com/Munter/subfont/commit/80bf78ee9d50bc74628756e103274a660d07b31b) ([Peter Müller](mailto:munter@fumle.dk))
- [Update assetgaph, httpception, mocha, nyc, sinon and unexpected](https://github.com/Munter/subfont/commit/8e055f2bca09b77fbeb3adaa51dcc42c8bbfd5a0) ([Peter Müller](mailto:munter@fumle.dk))
- [Align linting config with Assetgraph](https://github.com/Munter/subfont/commit/64c45a190aeb8f53ea88445338175e1f95ee1d56) ([Peter Müller](mailto:munter@fumle.dk))

### v3.7.1 (2019-10-18)

#### Pull requests

- [#58](https://github.com/Munter/subfont/pull/58) Avoid an unhandled rejection if the font preload polyfill fails for some reason ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#60](https://github.com/Munter/subfont/pull/60) Switch to postcss-value-parser ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Fix broken main reference in package.json](https://github.com/Munter/subfont/commit/649f706c16a64505d02bb3df7ceeeab48cccf7e8) ([Peter Müller](mailto:munter@fumle.dk))
- [Update unexpected-set to ^2.0.1](https://github.com/Munter/subfont/commit/ab4c1136dfcc426315ab8617093f889617181ddf) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.7.0 (2019-08-11)

#### Pull requests

- [#57](https://github.com/Munter/subfont/pull/57) Add screenshot-based tests of the result of subsetting ([Andreas Lind](mailto:andreas.lind@peakon.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#59](https://github.com/Munter/subfont/pull/59) Don't memoize getFontFaceForFontUsage, it goes bad when running s… ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#55](https://github.com/Munter/subfont/pull/55) Adopt the subsetFonts transform from assetgraph ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Fix up truetype support](https://github.com/Munter/subfont/commit/241b0296f6ac904f9b8014ef264c8115e1a7175c) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [subsetLocalFont: Add ttf as an allowed format](https://github.com/Munter/subfont/commit/5f14eaab572457601c4ee50b7bcd702f868de7ac) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update prettier to ~1.18.2](https://github.com/Munter/subfont/commit/a20e905bc369149d084c5386f1da330ced0f145b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.3 (2019-05-30)

#### Pull requests

- [#46](https://github.com/Munter/subfont/pull/46) ci: test Node.js 8, 10 and 11 ([Daniel Ruf](mailto:daniel.ruf@ueberbit.de))
- [#44](https://github.com/Munter/subfont/pull/44) Switch to @gustavnikolaj\/async-main-wrap ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Do not dive into iframes, fixes \#54](https://github.com/Munter/subfont/commit/30fe18866c324b2c512d5ab1c23854fefb9e75cc) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update --canonicalroot docs to mention root-relative support, require assetgraph ^5.8.2](https://github.com/Munter/subfont/commit/43c16d1b5743cb0081df4a1334bf5cc31891ffeb) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Bump mocha timeout to 30s](https://github.com/Munter/subfont/commit/8d294eb9fa7cdb3bee08df41a893595791651624) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't output the "Output written to..." message in dry run mode](https://github.com/Munter/subfont/commit/4dcfaf2ecf7a60af49fc77d94eab82b4eaa1b69f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.2 (2018-10-03)

- [Upgrade to assetgraph 5.3.1](https://github.com/Munter/subfont/commit/c4563fd1f336a929b20a05b19190ce9e76df5496) ([Peter Müller](mailto:munter@fumle.dk))
- [Updte yargs to 12.0.2](https://github.com/Munter/subfont/commit/f487d4bd5daf3b4276b2b2cb20bb4974100165dc) ([Peter Müller](mailto:munter@fumle.dk))
- [Update dev-dependencies](https://github.com/Munter/subfont/commit/07ad282f630e357969b7e22a79493f3cc1fa6d1f) ([Peter Müller](mailto:munter@fumle.dk))
- [Update dependencies](https://github.com/Munter/subfont/commit/fa36adc20500c54d57bf9147de68348ea78c3476) ([Peter Müller](mailto:munter@fumle.dk))
- [Compress inserted javascripts](https://github.com/Munter/subfont/commit/e2a9ed0c76e6e364abc98d4e1085d53479aede2d) ([Peter Müller](mailto:munter@fumle.dk))
- [+5 more](https://github.com/Munter/subfont/compare/v3.6.1...v3.6.2)

### v3.6.1 (2018-08-09)

- [Update assetgraph to ^5.1.1](https://github.com/Munter/subfont/commit/0dd02a5c59b9b1b69e7efb1aff1fdffc12dc0b3e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Put CSS that has been brought home in \/subfont, make sure to add an extension, and add content hash to the file name](https://github.com/Munter/subfont/commit/3d0a26262623979d7af365d784784798bf4198b8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't attempt to bring home CSS that hasn't been loaded.](https://github.com/Munter/subfont/commit/eba5cb995c6ce07a005eb23be501d5dc04289531) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Subtract and mention HTML\/JS\/CSS size increase when reporting the total savings](https://github.com/Munter/subfont/commit/b5b9b130e308f7d70e0c82799f925f6fb4fc57d1) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.0 (2018-07-29)

- [Update assetgraph to ^5.1.0](https://github.com/Munter/subfont/commit/c4e480215115dcfa325c648315a612269ed5e1ae) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add checkIncompatibleTypes transform](https://github.com/Munter/subfont/commit/ff1a55c01a956b0a16ae44f611611f0cc2255b7a) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update assetgraph to ^5.0.0](https://github.com/Munter/subfont/commit/01bdb24c8d34b04cce59afd3fdeacab8af674ef8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add .npmrc to disable package-lock.json](https://github.com/Munter/subfont/commit/c197086a1036fdd9d9f1576ed10fd33d69275776) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.5.0 (2018-07-15)

- [Update assetgraph to ^4.12.0](https://github.com/Munter/subfont/commit/e8457f349dc1bc810b3b7f041493d0e8ba3f8142) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't follow JsonUrl relations \(they tend to point at Html assets\)](https://github.com/Munter/subfont/commit/e80ccc318d6f1dd39d71e6c137579c028cc8256f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.4.0 (2018-06-24)

- [Update assetgraph to ^4.11.0](https://github.com/Munter/subfont/commit/94a94626dd5b7594952ad8b59ec327a943e4c04b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.3.0 (2018-05-16)

#### Pull requests

- [#21](https://github.com/Munter/subfont/pull/21) no-recursive, fixes \#20 ([Peter Bengtsson](mailto:mail@peterbe.com))

#### Commits to master

- [Update assetgraph to ^4.7.2](https://github.com/Munter/subfont/commit/6ba1897168a65256b6e6f689c977fd3ffd81b702) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.2.2 (2018-05-01)

- [Update assetgraph to ^4.6.2, fixes \#22](https://github.com/Munter/subfont/commit/9f4785503ff9d264a291a9acbd333a8944fd4d33) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.2.1 (2018-04-21)

- [Add RssChannel to relations not to follow](https://github.com/Munter/subfont/commit/f5aa89053ab9ae9ed577a964a243e81af2973d19) ([Peter Müller](mailto:munter@fumle.dk))

### v3.2.0 (2018-04-21)

- [Lint](https://github.com/Munter/subfont/commit/d5370cf37c3651a8e597bd1e090475868f68ed36) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 4.6.1](https://github.com/Munter/subfont/commit/1b7113fbaabf75b7f873732f70e1631559d4e31a) ([Peter Müller](mailto:munter@fumle.dk))
- [Improve message about where files have been written to](https://github.com/Munter/subfont/commit/fe45fd7337bef420b0b54615518c386a4f83f5af) ([Peter Müller](mailto:munter@fumle.dk))
- [Exclude OpenGraph traversal](https://github.com/Munter/subfont/commit/affb94b758f1b3a0765277f5a66b971724687157) ([Peter Müller](mailto:munter@fumle.dk))
- [Added --canonicalroot CLI option](https://github.com/Munter/subfont/commit/2a33d5afb11b60a42ede2b3d85a7e7ca8e0fd70e) ([Peter Müller](mailto:munter@fumle.dk))
- [+1 more](https://github.com/Munter/subfont/compare/v3.1.0...v3.2.0)

### v3.1.0 (2018-03-23)

#### Pull requests

- [#18](https://github.com/Munter/subfont/pull/18) Add prettier setup, split cli from programmatic interface, clean up, fix \#15 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update assetgraph to ^4.0.6, fixes \#19](https://github.com/Munter/subfont/commit/b8896f6968785b3e7f53c94c09daaf6126fffcef) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Badges in README](https://github.com/Munter/subfont/commit/88e0266570adf48f01e30e70bd62a47a02a886ac) ([Peter Müller](mailto:munter@fumle.dk))
- [Add test script, lint script, coverage, travis, coveralls](https://github.com/Munter/subfont/commit/d2fef0a7814d34fe2de866d9509d64a66cc2f215) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix indentation glitch](https://github.com/Munter/subfont/commit/8d6727c9618d421a80905225492db76d5de2438b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.0.0 (2018-03-11)

#### Pull requests

- [#17](https://github.com/Munter/subfont/pull/17) Update to assetgraph 4 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Improve description and add engine limitation inherited from assetgraph](https://github.com/Munter/subfont/commit/ba33b5a0205e1b1ca9720389cc7009c684f90f5e) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.1 (2017-12-14)

- [Update assetgraph to 3.13.1](https://github.com/Munter/subfont/commit/d809933353cf0e29e258b779211b17444306ae29) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.0 (2017-12-09)

#### Pull requests

- [#11](https://github.com/Munter/subfont/pull/11) Support subfont --\[no-\]recursive ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#2](https://github.com/Munter/subfont/pull/2) Fix extra files in output ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update README](https://github.com/Munter/subfont/commit/99157e65984b315f7cb1340817f2ccf04ba2d038) ([Peter Müller](mailto:munter@fumle.dk))
- [Renamed --inline-subsets option to --inline-fonts](https://github.com/Munter/subfont/commit/d96113312e291875b63543a5ff18b5691f840be9) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph v3.13.0](https://github.com/Munter/subfont/commit/79fa0b3aeb90fb5420d55fa4e91a1994e0a1e11f) ([Peter Müller](mailto:munter@fumle.dk))
- [Updated assegraph to 3.12.0](https://github.com/Munter/subfont/commit/e8e5f6422db11b8805af50c1e4c5428f6ae3ed2a) ([Peter Müller](mailto:munter@fumle.dk))
- [Remove assetgraph JavascriptStaticUrl weirdness](https://github.com/Munter/subfont/commit/9b565eb28125eb7a5d7de4fcb5543fea02ebe855) ([Peter Müller](mailto:munter@fumle.dk))
- [+3 more](https://github.com/Munter/subfont/compare/v1.1.0...v2.0.0)

### v1.1.0 (2017-10-05)

- [Update README](https://github.com/Munter/subfont/commit/08a68ecb2060c1b4c2d58b4c11702eee5ba5c697) ([Peter Müller](mailto:munter@fumle.dk))
- [Add --inline-css and --font-display options](https://github.com/Munter/subfont/commit/a4570a74b5987409b79551c3586144ef856c61dc) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/Munter/subfont/commit/26a464dbed872ff27a13df6efbe0fb3b40fa988a) ([Peter Müller](mailto:munter@fumle.dk))
- [Added before and after diagram image in README](https://github.com/Munter/subfont/commit/9ee7aa4c84d38ab2be4d692ec64b1ac898aee12d) ([Peter Müller](mailto:munter@fumle.dk))

### v1.0.0 (2017-09-05)

- [Initial commit](https://github.com/Munter/subfont/commit/3f3b0c2529596de78528e555ad8cc78fb0b18d5f) ([Peter Müller](mailto:munter@fumle.dk))

