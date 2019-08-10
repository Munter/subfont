/**
 * Created by Onur Demiralay
 * MIT License Copyright(c) 2014 Onur Demiralay
 *
 * woff2sfnt converter
 */

var fs = require('fs');
var woff2sfntConverter = require('./index.js').toSfnt;
var input = fs.readFileSync(process.argv[2]);
var woff = new Buffer(input);
fs.writeFileSync(process.argv[3], woff2sfntConverter(woff));