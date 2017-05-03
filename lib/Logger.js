'use strict';
const clc = require('cli-color');
// ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
// var utils = require('./utils');
// console.log('logger utils', utils);

let DEFAULT_OPTIONS = {
  level: 'info'
};

module.exports = class Logger {
  constructor(options) {
    options = options || {};
    // Requiring utils inline to avoid circular dependency race condition.
    this.options = require('./utils').mergeOptions(options, DEFAULT_OPTIONS);
    this.console = options.console || console;
    this.clc = options.clc || clc;
    this.silent = !!options.silent;
  }

  newline() {
    if(this.silent) { return; }
    this.console.log();
  }

  log() {
    if(this.silent) { return; }
    this.console.log.apply(this.console, arguments);
  }

  debug() {
    if(this.silent) { return; }
    if(this.options.level !== 'debug') { return; }

    this.console.log(this.clc.magenta.apply(clc, arguments));
  }

  bold() {
    if(this.silent) { return; }
    this.console.log(this.clc.bold.apply(clc, arguments));
  }

  error() {
    if(this.silent) { return; }
    this.console.log(this.clc.red.apply(clc, arguments));
  }

  errorBold() {
    if(this.silent) { return; }
    this.console.log(this.clc.red.bold.apply(clc, arguments));
  }

  success() {
    if(this.silent) { return; }
    this.console.log(this.clc.green.apply(clc, arguments));
  }

  warn() {
    if(this.silent) { return; }
    this.console.log(this.clc.yellow.apply(clc, arguments));
  }

  warnBold() {
    if(this.silent) { return; }
    this.console.log(this.clc.yellow.bold.apply(clc, arguments));
  }
};
