/**
 * Created by Onur Demiralay
 * MIT License Copyright(c) 2014 Onur Demiralay
 *
 * sfnt2woff & woff2sfnt converter based on http://people.mozilla.org/~jkew/woff/woff-2009-09-16.html
 */

//TODO: Create test suites using Unit.js
//TODO: Implement metadata and private data options. (Test these as well)

"use strict";
var pako = require('pako');


//given bit, do 4byte alignment by finding the nearest number that's divisible by 4.
function fourByteAlign(bit) {
    return (bit + 3) & ~ 3;
}
/* Validates 4bytealigned checksum against original checksum */
function validateCheckSums(csum1, csum2) {
    if(csum1 !== csum2) {
        //console.log("mismatch!");
        throw 'Checksum Mismatch!';
    }
}
/* 64-bit unsigned number emulator, if num overflow or underflow, it'll make the necessary adjustments.  */
function convertULong(num) {
    return num >>> 64;
}

/* Calculates checksum for 4byte aligned data */
function calcCheckSum(tableDirEntry, sfntBuf) {
    var offset = tableDirEntry.offset;
    var length = fourByteAlign(tableDirEntry.length);
    var csum = 0;
    for (var i = 0; i < length; i += 4) {
        var data =  sfntBuf.readUInt32BE(offset + i);
        csum =  convertULong(data + csum); //((data + csum) % 0x100000000); //emulating unsigned 32 bit integer.
    }
    /* If it's the header, then find checksumadjustment and substract from checksumAdj to find the actual checksum. */
    if (tableDirEntry.tag === 1751474532 || tableDirEntry.tag === 1651008868) { //1751474532 in decimal is 'head' in ascii 1651008868 is 'bhed' in decimal
        var checkSumAdjustment = sfntBuf.readUInt32BE(offset + 2 * 4); //2nd val is the check sum adjustment
        csum = convertULong(csum - checkSumAdjustment);
    }
    return csum;
}
/* Constructs the WOFF data by concatenating WOFF Buffers
 * Here's a top down structure: Header <- TableDir <- Table Data
 */
function constructWOFF(WOFFHeader, WOFFTableDir, WOFFTableData, WOFFSize) {
    var WOFF = Buffer.concat([WOFFHeader, WOFFTableDir]);
    for (var i = 0; i < WOFFTableData.length; ++i) {
        WOFF = Buffer.concat([WOFF, WOFFTableData[i]]);
    }
    /* Throw an exception if the WOFF's size doesn't match the size specified in the header */
    if (WOFF.length !== WOFFSize) {
        throw "Error occurred while constructing WOFF! WOFF size doesn't match the size specified in the header! " + WOFF.length + " != " + WOFFSize;
    }
    //console.log(WOFF.length + " == " + WOFFSize);
    return WOFF;
}

/* Copies the contents of buf1 to buf2
 * This function assumes alignedLen will always be bigger or equal to buf's length.
 */
function fourByteAlignedBuffer(buf, len) {
    var alignedLen = fourByteAlign(len);
    //console.log("long aligned length: " + alignedLen);
    var woffData = new Buffer(alignedLen);
    var zeroPaddedLen = alignedLen - buf.length;
    for (var i = 0; i < buf.length; ++i) {
        //console.log(buf[i]);
        woffData[i] = buf[i];
    }
    //extra bytes zero padded
    for (i = 0; i < zeroPaddedLen; ++i) {
        woffData[buf.length + i] = 0;
    }
    return woffData;
}

//TODO:DEPRICATED! DELETE THIS FUNCTION
/* Converts Buffer to Uint8Array */
function toArrayBuffer(buf) {
    var arrBuf = new ArrayBuffer(buf.length);
    var view = new Uint8Array(arrBuf);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return arrBuf;
}

/*The sfnt based font specifications require that the table directory entries are sorted in ascending order of tag value.
* comparator function for sort() function.
* */
function tagComparison(entry1, entry2) {
    var tag1Str = entry1.tag.toString();
    var tag2Str = entry2.tag.toString();

    if(tag1Str < tag2Str) {
        return -1;
    }
    if (tag1Str > tag2Str) {
        return 1;
    }
    return 0;
}

/* Constructs the WOFF Header, This version does not support metadata or private data.
 * if you wish to add support make sure to add necessary changes to the header
 * TODO: Find out if we're suppose to use sfnt versions as woff versions
 */
function constructWOFFHeader(flavor, woffLen, numTables, totalSfntSize) {
    var WOFF_HEADER_LENGTH = 44;
    var WOFF_SIGNATURE = 0x774F4646;
    var WOFFHeader = new Buffer(WOFF_HEADER_LENGTH);

    WOFFHeader.writeUInt32BE(WOFF_SIGNATURE,0); //Woff Signature
    WOFFHeader.writeUInt32BE(flavor,4); //Flavor
    WOFFHeader.writeUInt32BE(woffLen,8); //Woff Length
    WOFFHeader.writeUInt16BE(numTables,12); //Woff Number of Tables
    WOFFHeader.writeUInt16BE(0,14); //Woff Reserved (Always set to 0)
    WOFFHeader.writeUInt32BE(totalSfntSize,16); //Woff Total SFNT Size
    WOFFHeader.writeUInt16BE(0,20); //Woff Major Version
    WOFFHeader.writeUInt16BE(0,22); //Woff Minor Version
    WOFFHeader.writeUInt32BE(0,24); //Woff Meta Offset
    WOFFHeader.writeUInt32BE(0,28); //Woff Meta Length
    WOFFHeader.writeUInt32BE(0,32); //Woff Meta Original Length (uncompressed size of meta block)
    WOFFHeader.writeUInt32BE(0,36); //Woff Private Offset
    WOFFHeader.writeUInt32BE(0,40); //Woff Private Length
    return WOFFHeader;
}

/* Given sfnt (.otf, .ttf) converts it to .woff format.
 * converter is based on http://people.mozilla.org/~jkew/woff/woff-2009-09-16.html
 * */
function sfnt2woff(sfnt) {
    var sfntBuffer = new Buffer(sfnt);
    var tableDirectory = [];

    var SFNT_TABLE_DIR_SIZE = 16; /* 4byte for each tag, checksum, offset, length */
    var SFNT_HEADER_LENGTH = 12; /* 2 byte for each numTables, searchRange, entrySelector, rangeShift, 4 byte for version*/
    var WOFF_TABLE_DIR_SIZE = 20;
    var WOFF_HEADER_LENGTH = 44;

    var numTables = sfntBuffer.readUInt16BE(4);
    var flavor = sfntBuffer.readUInt32BE(0);
    var totalSfntSize = (numTables * SFNT_TABLE_DIR_SIZE) + SFNT_HEADER_LENGTH; //total expected size of decoded font.
    //var checkSumAdjustment = 0;

    /* Table directory entries start after sfnt header, each entry consist of tag, offset, length, checksum. */
    for (var i = 0; i < numTables; ++i) {
        var next = SFNT_HEADER_LENGTH + (i * SFNT_TABLE_DIR_SIZE);
        //Read SFNT Table Directory entries
        var tableDirectoryEntry = {
            tag: sfntBuffer.readUInt32BE(next),
            checksum: sfntBuffer.readUInt32BE(next + 4),
            offset: sfntBuffer.readUInt32BE(next + 8),
            length: sfntBuffer.readUInt32BE(next + 12)
        };
        /*
         console.log("tag: " + tableDirectoryEntry.tag.toString(16));
         console.log("checksum: " + tableDirectoryEntry.checksum.toString(16));
         console.log("offset: " + tableDirectoryEntry.offset.toString(16));
         console.log("length: " + tableDirectoryEntry.length.toString(16));
         */
        tableDirectory.push(tableDirectoryEntry);
    }

    /* This might not be needed, sfnt directory should already be sorted by tag. */
    tableDirectory = tableDirectory.sort(tagComparison);

    /* Table Directory Size = numTables * is calculated by multiplying the numTables value in the WOFF header times the size of a single WOFF table directory */
    var woffTableSize = numTables * WOFF_TABLE_DIR_SIZE;
    var woffTableOffset = WOFF_HEADER_LENGTH + woffTableSize; //table dir field starts right after header field.

    var WOFFTableDir = new Buffer(woffTableSize);
    var WOFFTableData = []; //contains all the font data for every table.


    /* construct WOFF Table Directory */
    for (i = 0; i < numTables; ++i) {
        tableDirectoryEntry = tableDirectory[i];

        /* calculate checksum for each table and check for mismatch */
        var csum = calcCheckSum(tableDirectoryEntry, sfntBuffer);
        validateCheckSums(csum, tableDirectoryEntry.checksum);

        /* sfnt header tag! */
        /*
         if (tableDirectoryEntry.tag === 1751474532 || tableDirectoryEntry.tag === 1651008868) {
         //flavor = sfntBuffer.readUInt32BE(tableDirectoryEntry.offset); //won't work if it's otf
         //checkSumAdjustment = sfntBuffer.readUInt32BE(tableDirectoryEntry.offset + 2 * 4);
         } */
        totalSfntSize += fourByteAlign(tableDirectoryEntry.length);
        var end = tableDirectoryEntry.offset +  tableDirectoryEntry.length;
        var start = tableDirectoryEntry.offset;

        /* Slice the buffer to get the data for current table. */
        var sfntSlice = sfntBuffer.slice(start, end);

        //compress the data
        var compSfntData = pako.deflate(sfntSlice);
        var compLength = sfntSlice.length < compSfntData.length ? sfntSlice.length : compSfntData.length;
        var woffDataEntry = fourByteAlignedBuffer(sfntSlice, compLength);

        /* if compressed data is equal or larger than uncompressed, use uncompressed data. */
        if (compSfntData.length >= sfntSlice.length) {
            woffDataEntry = fourByteAlignedBuffer(sfntSlice, compLength);
        } else {
            woffDataEntry = fourByteAlignedBuffer(compSfntData, compLength);
        }

        /*Construct Woff Table Directory, WoffTableDir = tag, offset,  compressed length, length, checksum (in that order)*/
        WOFFTableDir.writeUInt32BE(tableDirectoryEntry.tag, i* WOFF_TABLE_DIR_SIZE);
        WOFFTableDir.writeUInt32BE(woffTableOffset, i* WOFF_TABLE_DIR_SIZE + 4);
        WOFFTableDir.writeUInt32BE(compLength, i* WOFF_TABLE_DIR_SIZE + 8);
        WOFFTableDir.writeUInt32BE(tableDirectoryEntry.length, i* WOFF_TABLE_DIR_SIZE + 12);
        WOFFTableDir.writeUInt32BE(tableDirectoryEntry.checksum, i* WOFF_TABLE_DIR_SIZE + 16);

        woffTableOffset += woffDataEntry.length; //update woff offset.
        WOFFTableData.push(woffDataEntry);
    }

    //console.log("Flavor: " + flavor);
    //console.log("woffLen: " + woffTableOffset);
    //console.log("numTables: " + numTables);
    //console.log("totalSfntSize: " + totalSfntSize);

    var WOFFHeader = constructWOFFHeader(flavor, woffTableOffset, numTables, totalSfntSize);
    var WOFF = constructWOFF(WOFFHeader,WOFFTableDir, WOFFTableData, woffTableOffset);
    return WOFF;
}
/* Converts Woff to its original format (TTF or OTF) */
function woff2sfnt(woff) {
    var woffBuffer = new Buffer(woff);
    var tableDirectory = [];

    var SFNT_HEADER_LENGTH = 12;
    var SFNT_TABLE_DIR_SIZE = 16;
    var WOFF_TABLE_DIR_SIZE = 20;
    var WOFF_HEADER_LENGTH = 44;

    /* Calculate necessary header fields. */
    var numTables = woffBuffer.readUInt16BE(12);
    var sfntVersion = woffBuffer.readUInt32BE(4); //woff flavor
    var nearestPow2 = Math.pow(2, Math.floor(Math.log(numTables) / Math.log(2)));
    var searchRange = nearestPow2 * 16;
    var entrySelector = Math.log(nearestPow2) / Math.LN2;
    var rangeShift = numTables * 16 - searchRange;

    var SFNTHeader = constructSFNTHeader(sfntVersion, numTables, searchRange, entrySelector, rangeShift);

    /* Table Directory Size = it's calculated by multiplying the numTables value in the SFNT header times the size of a single SFNT table directory */
    var sfntTableSize = numTables * SFNT_TABLE_DIR_SIZE;
    var sfntTableOffset = SFNT_HEADER_LENGTH; //table dir field starts right after header field.

    for (var i = 0; i < numTables; ++i) {
        var next = WOFF_HEADER_LENGTH + (i * WOFF_TABLE_DIR_SIZE);
        //read WOFF directory entries
        var tableDirectoryEntry = {
            tag: woffBuffer.readUInt32BE(next),
            offset: woffBuffer.readUInt32BE(next + 4),
            compLen: woffBuffer.readUInt32BE(next + 8),
            origLen: woffBuffer.readUInt32BE(next + 12),
            origChecksum: woffBuffer.readUInt32BE(next + 16)
        };
        tableDirectory.push(tableDirectoryEntry);
        sfntTableOffset += SFNT_TABLE_DIR_SIZE;
    }
    /* This might not be needed, sfnt directory should already be sorted by tag. */
    tableDirectory = tableDirectory.sort(tagComparison);

    var SFNTTableDir = new Buffer(sfntTableSize);
    var SFNTTableData = []; //contains all the font data for every table.
    /* decompress the */
    for (i = 0; i < numTables; ++i) {
        tableDirectoryEntry = tableDirectory[i];
        var start = tableDirectoryEntry.offset;
        var end = tableDirectoryEntry.offset +  tableDirectoryEntry.compLen ;

        /* Slice the buffer to get the data for current table. */
        var woffSlice = woffBuffer.slice(start, end);
        var sfntDataEntry;

        /* if uncompressed data is not equal to compressed, then uncompress and use the data. */
        if (tableDirectoryEntry.origLen != tableDirectoryEntry.compLen) {
            //console.log("origLen != compLen: " + tableDirectoryEntry.origLen + " " + tableDirectoryEntry.compLen);
            sfntDataEntry = pako.inflate(woffSlice);
            sfntDataEntry = toBuffer(sfntDataEntry);
            //sfntDataEntry = new Buffer( new Uint8Array(sfntDataEntry) );
        } else {
            sfntDataEntry = woffSlice;
        }

        /* Construct Sfnt Table Directory, SFNTTableDir = tag, checksum, offset, length */
        SFNTTableDir.writeUInt32BE(tableDirectoryEntry.tag, i * SFNT_TABLE_DIR_SIZE);
        SFNTTableDir.writeUInt32BE(tableDirectoryEntry.origChecksum, i * SFNT_TABLE_DIR_SIZE + 4);
        SFNTTableDir.writeUInt32BE(sfntTableOffset, i * SFNT_TABLE_DIR_SIZE + 8);
        SFNTTableDir.writeUInt32BE(tableDirectoryEntry.origLen, i * SFNT_TABLE_DIR_SIZE + 12);

        /* Check if we need to pad extra 0s (since woff data was 4byte aligned), if they are update sfnt offset accordingly. */
        if (tableDirectoryEntry.origLen % 4 !== 0) {
            sfntDataEntry = fourByteAlignedBuffer(sfntDataEntry,tableDirectoryEntry.origLen);
            sfntTableOffset += sfntDataEntry.length;
        } else {
            sfntTableOffset += tableDirectoryEntry.origLen;
        }

        SFNTTableData.push(sfntDataEntry); //store table data
    }

    //console.log(sfntTableOffset);
    //console.log(SFNTHeader.length);
    //console.log(SFNTTableDir.length);
    //console.log(SFNTTableData.length);
    var SFNT  = constructSFNT(SFNTHeader, SFNTTableDir, SFNTTableData);
    return SFNT;
}

/* Constructs the SFNT data by concatenating SFNT Buffers
 * Here's a top down structure: Header <- TableDir <- Table Data
 */
function constructSFNT(SFNTHeader, SFNTTableDir, SFNTTableData) {
    var SFNT = Buffer.concat([SFNTHeader, SFNTTableDir]);

    for (var i = 0; i < SFNTTableData.length; ++i) {
        SFNT = Buffer.concat([SFNT, SFNTTableData[i]]);
    }
    return SFNT;
}



/*Constructs SFNT Header */
function constructSFNTHeader(sfntVersion, numTables, searchRange, entrySelector, rangeShift) {
    var SFNT_HEADER_LENGTH = 12;
    var SFNTHeader = new Buffer(SFNT_HEADER_LENGTH);
    SFNTHeader.writeInt32BE(sfntVersion,0); //SFNT Version
    SFNTHeader.writeUInt16BE(numTables,4); //SFNT Number of Tables
    SFNTHeader.writeUInt16BE(searchRange,6); //SFNT Search Range (Maximum power of 2 <= numTables) x 16.
    SFNTHeader.writeUInt16BE(entrySelector,8); //SFNT Entry Selector (Log2(maximum power of 2 <= numTables).
    SFNTHeader.writeUInt16BE(rangeShift,10); // SFNT Range Shift (NumTables x 16-searchRange.)
    return SFNTHeader;
}

/* inflate function returns uint8array/arrayBuffer, this helper converts it back to buffer */
function toBuffer(arrBuf) {
    var buf = new Buffer(arrBuf.byteLength);
    var view = new Uint8Array(arrBuf);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

//module.exports = sfnt2woff;
module.exports = {
    toWoff: sfnt2woff,
    toSfnt: woff2sfnt
};