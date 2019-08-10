/**
 * Created by Onur Demiralay
 * MIT License Copyright(c) 2014 Onur Demiralay
 *
 * sfnt2woff converter
 */

var fs = require('fs');
var sfnt2woffConverter = require('./index.js').toWoff;
var input = fs.readFileSync(process.argv[2]);
var sfnt = new Buffer(input);
fs.writeFileSync(process.argv[3], sfnt2woffConverter(sfnt));
