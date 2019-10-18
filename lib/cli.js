#!/usr/bin/env node

require('@gustavnikolaj/async-main-wrap')(require('./main'))(
  require('./parseCommandLineOptions')(),
  console
);
