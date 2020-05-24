### v5.0.0 (2020-05-24)

#### Pull requests

- [#90](https://github.com/munter/subfont/pull/90) Don't break when an unused variant points at a non-existent file ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#87](https://github.com/munter/subfont/pull/87) Fix uniq-ification of strings that might contain non-UTF-16 chars ([Andreas Lind](mailto:andreas.lind@peakon.com))

#### Commits to master

- [Update to prettier 2 and reformat all files](https://github.com/munter/subfont/commit/de6a482f31075245ed957aa8057a24e31addd612) ([Peter Müller](mailto:munter@fumle.dk))
- [Update yargs to 15.3.1](https://github.com/munter/subfont/commit/d10b5cbe289ae86f17b749fd05b75f68b708f88e) ([Peter Müller](mailto:munter@fumle.dk))
- [Update sinon to 9.0.2](https://github.com/munter/subfont/commit/694d30960dcc9e15b0c6b1b7a95da3459c1b4db9) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to nyc 15](https://github.com/munter/subfont/commit/d5bb5e43c22471b863febeeafe00b2134acffff5) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to puppeteer 3.1.0](https://github.com/munter/subfont/commit/c1109023ef26cd986800eb4e2d8063567de9492e) ([Peter Müller](mailto:munter@fumle.dk))
- [+7 more](https://github.com/munter/subfont/compare/v4.2.1...v5.0.0)

### v4.2.1 (2020-04-05)

- [#85](https://github.com/munter/subfont/pull/85) Don't break in --no-fallbacks mode when multiple pages share the same CSS ([Andreas Lind](mailto:andreas.lind@peakon.com), [suziwen](mailto:suziwen1@gmail.com))

### v4.2.0 (2020-02-19)

#### Pull requests

- [#76](https://github.com/munter/subfont/pull/76) Fix the prettier setup ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#75](https://github.com/munter/subfont/pull/75) Fix omitFallbacks with Google Web Fonts ([Andreas Lind](mailto:andreas.lind@peakon.com))

#### Commits to master

- [Switch to the official css-font-parser now that bramstein\/css-font-parser\#7 has been merged and released](https://github.com/munter/subfont/commit/457c7f0e4cef0a8c1bd8f816c23ace64c9987424) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't populate source map relations](https://github.com/munter/subfont/commit/5c07218b6f1dcc6fad88702a3bcb7b33bf9df54e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.1.1 (2020-01-04)

- [Add regression test](https://github.com/munter/subfont/commit/46eddce9c09268dbde459b1f98fe5cec9e4c98f5) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't attempt to prefetch inlined fonts](https://github.com/munter/subfont/commit/844e21e53b72ac7c7efe2f4c0549a71ade5d823c) ([Jesse Farebrother](mailto:jessefarebro@gmail.com))

### v4.1.0 (2020-01-03)

- [#72](https://github.com/munter/subfont/pull/72) Add subsetPerPage & format options ([Jesse Farebrother](mailto:jessefarebro@gmail.com))

### v4.0.5 (2019-12-12)

- [Update dev dependencies](https://github.com/munter/subfont/commit/c6ed229b05a39c5dfe21278b0b51f44050ab6efd) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 6.0.4](https://github.com/munter/subfont/commit/d49a23a3347c1370410c17cc44283c130c108bc3) ([Peter Müller](mailto:munter@fumle.dk))
- [Add missing end paren in status message](https://github.com/munter/subfont/commit/ff4e87cafac535fb7bdf38cd41b811bd20cc5566) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update font-tracer to ^1.3.1](https://github.com/munter/subfont/commit/e5652edcc5ecaa2ab9f0c13a7f6de703ec0b806e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update font-tracer to ^1.3.0](https://github.com/munter/subfont/commit/70f8292a3eba429973475b745bfd41d5f8b9b19d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.4 (2019-11-16)

#### Pull requests

- [#70](https://github.com/munter/subfont/pull/70) getCssRules...: Add support for default XML namespaces in stylesheets ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update font-snapper to ^1.0.1](https://github.com/munter/subfont/commit/e90ea786ead4a803a68d5d442b1d1a98474afd16) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Reference image tests: Close pages after screenshotting them](https://github.com/munter/subfont/commit/7ae9494535c9fbcde4328aa43d98de43eddc0d01) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add vscode debugger launch configuration for the test suite](https://github.com/munter/subfont/commit/f8f9abc42909c556765555cc49f44eb40a9194db) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Guard against an already detached relation when cleaning up](https://github.com/munter/subfont/commit/6392fc359222772c9033a58a9020e3b35487d019) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.3 (2019-11-02)

#### Pull requests

- [#67](https://github.com/munter/subfont/pull/67) Only warn about missing fonttools install if we are actually trying t… ([Peter Müller](mailto:munter@fumle.dk))

#### Commits to master

- [Fix accidental console.log during test](https://github.com/munter/subfont/commit/2378e0c2da6aedbdcfc88d566e55829cc1da9b6d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Avoid failing in the code that counts the savings when fonttools isn't available](https://github.com/munter/subfont/commit/8bb72e175fec3f53b1cd88a829caac3d03ddc75d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add auto generated changelog on release](https://github.com/munter/subfont/commit/5afe8b802d7bcda75adfc59652da891f216b4526) ([Peter Müller](mailto:munter@fumle.dk))

### v4.0.2 (2019-11-02)

#### Pull requests

- [#65](https://github.com/munter/subfont/pull/65) Don't use the short document.fonts.forEach preload polyfill in inlineCss mode ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#66](https://github.com/munter/subfont/pull/66) Fix early return inside for loop ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Travis: Use node 12 instead of latest, avoiding 13 which does not work yet](https://github.com/munter/subfont/commit/4db7abcc921c56020fc835655f21c9edeaaaa19e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Remove unused function, whoops](https://github.com/munter/subfont/commit/636a4a6fef2cd27077874c8d4a2f4d18b1b08176) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.1 (2019-10-22)

- [README: Update CLI help with the new options](https://github.com/munter/subfont/commit/6021e1f4084e9e2481a460977839fdfafc8a292d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't list --no-recursive separately now that it's the default](https://github.com/munter/subfont/commit/e5d0b70b483346ea1996e4a6412cf68b003412a4) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix subfont --help](https://github.com/munter/subfont/commit/d5a1e12385eff1ee880d2419661deaa975d24293) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Lint after running the test suite](https://github.com/munter/subfont/commit/751c87d6418a6ec42ac5920b4916d773440664fd) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v4.0.0 (2019-10-22)

#### Pull requests

- [#49](https://github.com/munter/subfont/pull/49) Dynamic traces ([Andreas Lind](mailto:andreas.lind@peakon.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#28](https://github.com/munter/subfont/pull/28) Make --no-recursive the default ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#61](https://github.com/munter/subfont/pull/61) Rearrange so the main export works as a programmatic api \(instead of accepting an argv array\) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#63](https://github.com/munter/subfont/pull/63) Update dependencies to enable Greenkeeper 🌴 ([greenkeeper[bot]](mailto:23040076+greenkeeper[bot]@users.noreply.github.com))

#### Commits to master

- [Update yargs and async-main-wrap](https://github.com/munter/subfont/commit/80bf78ee9d50bc74628756e103274a660d07b31b) ([Peter Müller](mailto:munter@fumle.dk))
- [Update assetgaph, httpception, mocha, nyc, sinon and unexpected](https://github.com/munter/subfont/commit/8e055f2bca09b77fbeb3adaa51dcc42c8bbfd5a0) ([Peter Müller](mailto:munter@fumle.dk))
- [Align linting config with Assetgraph](https://github.com/munter/subfont/commit/64c45a190aeb8f53ea88445338175e1f95ee1d56) ([Peter Müller](mailto:munter@fumle.dk))

### v3.7.1 (2019-10-18)

#### Pull requests

- [#58](https://github.com/munter/subfont/pull/58) Avoid an unhandled rejection if the font preload polyfill fails for some reason ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#60](https://github.com/munter/subfont/pull/60) Switch to postcss-value-parser ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Fix broken main reference in package.json](https://github.com/munter/subfont/commit/649f706c16a64505d02bb3df7ceeeab48cccf7e8) ([Peter Müller](mailto:munter@fumle.dk))
- [Update unexpected-set to ^2.0.1](https://github.com/munter/subfont/commit/ab4c1136dfcc426315ab8617093f889617181ddf) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.7.0 (2019-08-11)

#### Pull requests

- [#55](https://github.com/munter/subfont/pull/55) Adopt the subsetFonts transform from assetgraph ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Fix up truetype support](https://github.com/munter/subfont/commit/241b0296f6ac904f9b8014ef264c8115e1a7175c) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [subsetLocalFont: Add ttf as an allowed format](https://github.com/munter/subfont/commit/5f14eaab572457601c4ee50b7bcd702f868de7ac) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update prettier to ~1.18.2](https://github.com/munter/subfont/commit/a20e905bc369149d084c5386f1da330ced0f145b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.3 (2019-05-30)

#### Pull requests

- [#46](https://github.com/munter/subfont/pull/46) ci: test Node.js 8, 10 and 11 ([Daniel Ruf](mailto:daniel.ruf@ueberbit.de))
- [#44](https://github.com/munter/subfont/pull/44) Switch to @gustavnikolaj\/async-main-wrap ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Do not dive into iframes, fixes \#54](https://github.com/munter/subfont/commit/30fe18866c324b2c512d5ab1c23854fefb9e75cc) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update --canonicalroot docs to mention root-relative support, require assetgraph ^5.8.2](https://github.com/munter/subfont/commit/43c16d1b5743cb0081df4a1334bf5cc31891ffeb) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Bump mocha timeout to 30s](https://github.com/munter/subfont/commit/8d294eb9fa7cdb3bee08df41a893595791651624) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't output the "Output written to..." message in dry run mode](https://github.com/munter/subfont/commit/4dcfaf2ecf7a60af49fc77d94eab82b4eaa1b69f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.2 (2018-10-03)

- [Upgrade to assetgraph 5.3.1](https://github.com/munter/subfont/commit/c4563fd1f336a929b20a05b19190ce9e76df5496) ([Peter Müller](mailto:munter@fumle.dk))
- [Updte yargs to 12.0.2](https://github.com/munter/subfont/commit/f487d4bd5daf3b4276b2b2cb20bb4974100165dc) ([Peter Müller](mailto:munter@fumle.dk))
- [Update dev-dependencies](https://github.com/munter/subfont/commit/07ad282f630e357969b7e22a79493f3cc1fa6d1f) ([Peter Müller](mailto:munter@fumle.dk))
- [Update dependencies](https://github.com/munter/subfont/commit/fa36adc20500c54d57bf9147de68348ea78c3476) ([Peter Müller](mailto:munter@fumle.dk))
- [Compress inserted javascripts](https://github.com/munter/subfont/commit/e2a9ed0c76e6e364abc98d4e1085d53479aede2d) ([Peter Müller](mailto:munter@fumle.dk))
- [+5 more](https://github.com/munter/subfont/compare/v3.6.1...v3.6.2)

### v3.6.1 (2018-08-09)

- [Update assetgraph to ^5.1.1](https://github.com/munter/subfont/commit/0dd02a5c59b9b1b69e7efb1aff1fdffc12dc0b3e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Put CSS that has been brought home in \/subfont, make sure to add an extension, and add content hash to the file name](https://github.com/munter/subfont/commit/3d0a26262623979d7af365d784784798bf4198b8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't attempt to bring home CSS that hasn't been loaded.](https://github.com/munter/subfont/commit/eba5cb995c6ce07a005eb23be501d5dc04289531) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Subtract and mention HTML\/JS\/CSS size increase when reporting the total savings](https://github.com/munter/subfont/commit/b5b9b130e308f7d70e0c82799f925f6fb4fc57d1) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.6.0 (2018-07-29)

- [Update assetgraph to ^5.1.0](https://github.com/munter/subfont/commit/c4e480215115dcfa325c648315a612269ed5e1ae) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add checkIncompatibleTypes transform](https://github.com/munter/subfont/commit/ff1a55c01a956b0a16ae44f611611f0cc2255b7a) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update assetgraph to ^5.0.0](https://github.com/munter/subfont/commit/01bdb24c8d34b04cce59afd3fdeacab8af674ef8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add .npmrc to disable package-lock.json](https://github.com/munter/subfont/commit/c197086a1036fdd9d9f1576ed10fd33d69275776) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.5.0 (2018-07-15)

- [Update assetgraph to ^4.12.0](https://github.com/munter/subfont/commit/e8457f349dc1bc810b3b7f041493d0e8ba3f8142) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't follow JsonUrl relations \(they tend to point at Html assets\)](https://github.com/munter/subfont/commit/e80ccc318d6f1dd39d71e6c137579c028cc8256f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.4.0 (2018-06-24)

- [Update assetgraph to ^4.11.0](https://github.com/munter/subfont/commit/94a94626dd5b7594952ad8b59ec327a943e4c04b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.3.0 (2018-05-16)

#### Pull requests

- [#21](https://github.com/munter/subfont/pull/21) no-recursive, fixes \#20 ([Peter Bengtsson](mailto:mail@peterbe.com))

#### Commits to master

- [Update assetgraph to ^4.7.2](https://github.com/munter/subfont/commit/6ba1897168a65256b6e6f689c977fd3ffd81b702) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.2.2 (2018-05-01)

- [Update assetgraph to ^4.6.2, fixes \#22](https://github.com/munter/subfont/commit/9f4785503ff9d264a291a9acbd333a8944fd4d33) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.2.1 (2018-04-21)

- [Add RssChannel to relations not to follow](https://github.com/munter/subfont/commit/f5aa89053ab9ae9ed577a964a243e81af2973d19) ([Peter Müller](mailto:munter@fumle.dk))

### v3.2.0 (2018-04-21)

- [Lint](https://github.com/munter/subfont/commit/d5370cf37c3651a8e597bd1e090475868f68ed36) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph 4.6.1](https://github.com/munter/subfont/commit/1b7113fbaabf75b7f873732f70e1631559d4e31a) ([Peter Müller](mailto:munter@fumle.dk))
- [Improve message about where files have been written to](https://github.com/munter/subfont/commit/fe45fd7337bef420b0b54615518c386a4f83f5af) ([Peter Müller](mailto:munter@fumle.dk))
- [Exclude OpenGraph traversal](https://github.com/munter/subfont/commit/affb94b758f1b3a0765277f5a66b971724687157) ([Peter Müller](mailto:munter@fumle.dk))
- [Added --canonicalroot CLI option](https://github.com/munter/subfont/commit/2a33d5afb11b60a42ede2b3d85a7e7ca8e0fd70e) ([Peter Müller](mailto:munter@fumle.dk))
- [+1 more](https://github.com/munter/subfont/compare/v3.1.0...v3.2.0)

### v3.1.0 (2018-03-23)

#### Pull requests

- [#18](https://github.com/munter/subfont/pull/18) Add prettier setup, split cli from programmatic interface, clean up, fix \#15 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update assetgraph to ^4.0.6, fixes \#19](https://github.com/munter/subfont/commit/b8896f6968785b3e7f53c94c09daaf6126fffcef) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Badges in README](https://github.com/munter/subfont/commit/88e0266570adf48f01e30e70bd62a47a02a886ac) ([Peter Müller](mailto:munter@fumle.dk))
- [Add test script, lint script, coverage, travis, coveralls](https://github.com/munter/subfont/commit/d2fef0a7814d34fe2de866d9509d64a66cc2f215) ([Peter Müller](mailto:munter@fumle.dk))
- [Fix indentation glitch](https://github.com/munter/subfont/commit/8d6727c9618d421a80905225492db76d5de2438b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.0.0 (2018-03-11)

#### Pull requests

- [#17](https://github.com/munter/subfont/pull/17) Update to assetgraph 4 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Improve description and add engine limitation inherited from assetgraph](https://github.com/munter/subfont/commit/ba33b5a0205e1b1ca9720389cc7009c684f90f5e) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.1 (2017-12-14)

- [Update assetgraph to 3.13.1](https://github.com/munter/subfont/commit/d809933353cf0e29e258b779211b17444306ae29) ([Peter Müller](mailto:munter@fumle.dk))

### v2.0.0 (2017-12-09)

#### Pull requests

- [#11](https://github.com/munter/subfont/pull/11) Support subfont --\[no-\]recursive ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [#2](https://github.com/munter/subfont/pull/2) Fix extra files in output ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Update README](https://github.com/munter/subfont/commit/99157e65984b315f7cb1340817f2ccf04ba2d038) ([Peter Müller](mailto:munter@fumle.dk))
- [Renamed --inline-subsets option to --inline-fonts](https://github.com/munter/subfont/commit/d96113312e291875b63543a5ff18b5691f840be9) ([Peter Müller](mailto:munter@fumle.dk))
- [Update to assetgraph v3.13.0](https://github.com/munter/subfont/commit/79fa0b3aeb90fb5420d55fa4e91a1994e0a1e11f) ([Peter Müller](mailto:munter@fumle.dk))
- [Updated assegraph to 3.12.0](https://github.com/munter/subfont/commit/e8e5f6422db11b8805af50c1e4c5428f6ae3ed2a) ([Peter Müller](mailto:munter@fumle.dk))
- [Remove assetgraph JavascriptStaticUrl weirdness](https://github.com/munter/subfont/commit/9b565eb28125eb7a5d7de4fcb5543fea02ebe855) ([Peter Müller](mailto:munter@fumle.dk))
- [+3 more](https://github.com/munter/subfont/compare/v1.1.0...v2.0.0)

### v1.1.0 (2017-10-05)

- [Update README](https://github.com/munter/subfont/commit/08a68ecb2060c1b4c2d58b4c11702eee5ba5c697) ([Peter Müller](mailto:munter@fumle.dk))
- [Add --inline-css and --font-display options](https://github.com/munter/subfont/commit/a4570a74b5987409b79551c3586144ef856c61dc) ([Peter Müller](mailto:munter@fumle.dk))
- [Update README.md](https://github.com/munter/subfont/commit/26a464dbed872ff27a13df6efbe0fb3b40fa988a) ([Peter Müller](mailto:munter@fumle.dk))
- [Added before and after diagram image in README](https://github.com/munter/subfont/commit/9ee7aa4c84d38ab2be4d692ec64b1ac898aee12d) ([Peter Müller](mailto:munter@fumle.dk))

### v1.0.0 (2017-09-05)

- [Initial commit](https://github.com/munter/subfont/commit/3f3b0c2529596de78528e555ad8cc78fb0b18d5f) ([Peter Müller](mailto:munter@fumle.dk))

