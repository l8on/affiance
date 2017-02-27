var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');

function HookContextPostRewrite(config, argv, input) {
  HookContextBase.prototype.constructor.apply(this, arguments);
  this.hookScriptName = 'post-rewrite';
  this.hookConfigName = 'PostRewrite';
  this._isInitialCommit = null;
}

Object.assign(HookContextPostRewrite.prototype, HookContextBase.prototype);

HookContextPostRewrite.prototype.isAmend = function() {
  return this.argv[0] === 'amend';
};

HookContextPostRewrite.prototype.isRebase = function() {
  return this.argv[0] === 'rebase';
};

HookContextPostRewrite.prototype.rewrittenCommits = function() {
  if (!this._rewrittenCommits) {
    var inputLines = this.inputLines();
    inputLines = inputLines.filter(function(line) { return !!line.trim()} );
    this._rewrittenCommits = inputLines.map(function(line) {
      var lineHashes = line.split(' ');
      return { oldHash:lineHashes[0], newHash: lineHashes[1] };
    });
  }
  return this._rewrittenCommits;
};

HookContextPostRewrite.prototype.modifiedFiles = function() {
  if (!this._modifiedFiles) {
    this._modifiedFiles = [];

    var self = this;
    this.rewrittenCommits().forEach(function(rewrittenCommit) {
      var refs = rewrittenCommit.oldHash + ' ' + rewrittenCommit.newHash;
      self._modifiedFiles = self._modifiedFiles.concat(gitRepo.modifiedFiles({ refs: refs }));
    });

    this._modifiedFiles = this.filterModifiedFiles(this._modifiedFiles);
  }

  return this._modifiedFiles;
};

module.exports = HookContextPostRewrite;
