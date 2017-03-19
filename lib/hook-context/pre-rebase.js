var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');
var utils = require('../utils');
var fileUtils = require('../fileUtils');
var AffianceError = require('../error');

function HookContextPreRebase(config, argv, input) {
  HookContextBase.prototype.constructor.apply(this, arguments);
  this.hookScriptName = 'pre-rebase';
  this.hookConfigName = 'PreRebase';
}

Object.assign(HookContextPreRebase.prototype, HookContextBase.prototype);

HookContextPreRebase.prototype.upstreamBranch = function() {
  return this.argv[0];
};

HookContextPreRebase.prototype.rebasedBranch = function() {
  if (!this._rebasedBranch) {
    this._rebasedBranch = this.argv[1] || utils.execSync('git symbolic-ref --short --quiet HEAD').trim();
  }
  return this._rebasedBranch;
};

HookContextPreRebase.prototype.isDetachedHead = function() {
  return !this.rebasedBranch();
};

HookContextPreRebase.prototype.isFastForward = function() {
  return !this.rebasedCommits().length;
};

HookContextPreRebase.prototype.rebasedCommits = function() {
  if (!this._rebasedCommits) {
    var rebasedRef = this.isDetachedHead() ? 'HEAD' : this.rebasedBranch();
    var commandResults = utils.execSync(
      'git rev-list --topo-order --reverse ' + this.upstreamBranch() + '..' + rebasedRef
    );

    if (commandResults === false) {
      throw AffianceError.error(
        AffianceError.GitRevListError,
        "Unable to get list of rebased commits"
      );
    }

    var trimmedResults = commandResults.trim();
    this._rebasedCommits = trimmedResults ? trimmedResults.split("\n") : [];
  }

  return this._rebasedCommits;
};

module.exports = HookContextPreRebase;
