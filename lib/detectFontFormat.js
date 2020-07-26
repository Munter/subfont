function detectFontFormat(buffer) {
  const signature = buffer.toString('ascii', 0, 4);
  if (signature === 'wOFF') {
    return 'woff';
  } else if (signature === 'wOF2') {
    return 'woff2';
  } else if (
    signature === 'true' ||
    signature === 'OTTO' ||
    signature === '\x00\x01\x00\x00'
  ) {
    return 'truetype';
  } else {
    throw new Error(`Unrecognized font signature: ${signature}`);
  }
}

module.exports = detectFontFormat;
