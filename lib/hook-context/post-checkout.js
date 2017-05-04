'use strict';
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');

module.exports = class HookContextPostCheckout extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'post-checkout';
    this.hookConfigName = 'PostCheckout';
  }

  previousHead() {
    return this.argv[0];
  }

  newHead() {
    return this.argv[1];
  }

  isBranchCheckout() {
    return parseInt(this.argv[2], 10) === 1;
  }

  isFileCheckout() {
    return !this.isBranchCheckout();
  }

  modifiedFiles() {
    if (!this._modifiedFiles) {
      this._modifiedFiles = gitRepo.modifiedFiles({refs: this.previousHead() + ' ' + this.newHead()});
    }

    return this._modifiedFiles;
  }
};
