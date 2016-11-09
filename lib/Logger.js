var clc = require('cli-color');
// ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
// var utils = require('./utils');
// console.log('logger utils', utils);

var DEFAULT_OPTIONS = {
    level: "info"
};

function Logger(options) {
  options = options || {};
  // Requiring utils inline to avoid circular dependency race condition.
  this.options = require('./utils').mergeOptions(options, DEFAULT_OPTIONS);
  this.console = options.console || console;
  this.clc = options.clc || clc;
  this.silent = !!options.silent;
}

Logger.prototype.newline = function() {
  if(this.silent) { return; }
  this.console.log()
};

Logger.prototype.log = function() {
  if(this.silent) { return; }
  this.console.log.apply(this.console, arguments);
};

Logger.prototype.debug = function() {
  if(this.silent) { return; }
  if(this.options.level !== 'debug') { return; }

  this.console.log(this.clc.magenta.apply(clc, arguments));
};

Logger.prototype.bold = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.bold.apply(clc, arguments));
};

Logger.prototype.error = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.red.apply(clc, arguments));
};

Logger.prototype.errorBold = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.red.bold.apply(clc, arguments));
};

Logger.prototype.success = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.green.apply(clc, arguments));
};

Logger.prototype.warn = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.yellow.apply(clc, arguments));
};

Logger.prototype.warnBold = function() {
  if(this.silent) { return; }
  this.console.log(this.clc.yellow.bold.apply(clc, arguments));
};

module.exports = Logger;
