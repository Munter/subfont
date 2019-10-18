#!/usr/bin/env node

require('@gustavnikolaj/async-main-wrap')(require('./subfont'))(
  require('./parseCommandLineOptions')(),
  console
);
