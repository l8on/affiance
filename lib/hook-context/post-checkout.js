var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');

function HookContextPostCheckout(config, argv, input) {
  HookContextBase.constructor.apply(this, arguments);
  this.hookScriptName = 'post-checkout';
}

Object.assign(HookContextPostCheckout.prototype, HookContextBase.prototype);

HookContextPostCheckout.prototype.previousHead = function() {
  return this.argv[1];
};

HookContextPostCheckout.prototype.newHead = function() {
  return this.argv[2];
};

HookContextPostCheckout.prototype.isBranchCheckout = function() {
  return parseInt(this.argv[3], 10) === 1;
};

HookContextPostCheckout.prototype.isFileCheckout = function() {
  return !this.isBranchCheckout();
};

HookContextPostCheckout.prototype.modifiedFiles = function() {
  if (!this._modifiedFiles) {
    this._modifiedFiles = gitRepo.modifiedFiles({refs: this.previousHead() + ' ' + this.newHead()});
  }

  return this._modifiedFiles;
};

module.exports = HookContextPostCheckout;
