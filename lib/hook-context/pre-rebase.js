'use strict';
const HookContextBase = require('./base');
const utils = require('../utils');
const AffianceError = require('../error');

module.exports = class HookContextPreRebase extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'pre-rebase';
    this.hookConfigName = 'PreRebase';
  }

  upstreamBranch() {
    return this.argv[0];
  }

  rebasedBranch() {
    if (!this._rebasedBranch) {
      this._rebasedBranch = this.argv[1] || utils.execSync('git symbolic-ref --short --quiet HEAD').trim();
    }
    return this._rebasedBranch;
  }

  isDetachedHead() {
    return !this.rebasedBranch();
  }

  isFastForward() {
    return !this.rebasedCommits().length;
  }

  rebasedCommits() {
    if (!this._rebasedCommits) {
      let rebasedRef = this.isDetachedHead() ? 'HEAD' : this.rebasedBranch();
      let commandResults = utils.execSync(
        'git rev-list --topo-order --reverse ' + this.upstreamBranch() + '..' + rebasedRef
      );
  
      if (commandResults === false) {
        throw AffianceError.error(
          AffianceError.GitRevListError,
          'Unable to get list of rebased commits'
        );
      }
  
      let trimmedResults = commandResults.trim();
      this._rebasedCommits = trimmedResults ? trimmedResults.split('\n') : [];
    }

    return this._rebasedCommits;
  }
};
