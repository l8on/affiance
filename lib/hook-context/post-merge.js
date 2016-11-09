var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');

function HookContextPostMerge(config, argv, input) {
  HookContextBase.constructor.apply(this, arguments);
  this.hookScriptName = 'post-merge';
  this.hookConfigName = 'PostMerge';
  this._isInitialCommit = null;
}

Object.assign(HookContextPostMerge.prototype, HookContextBase.prototype);

HookContextPostMerge.prototype.modifiedFiles = function() {
  if (!this._modifiedFiles) {
    var staged = this.isSquashCommit();
    var refs = this.isMergeCommit() ? 'HEAD^ HEAD' : '';
    this._modifiedFiles = gitRepo.modifiedFiles({refs: refs, staged: staged});
  }

  return this._modifiedFiles;
};

HookContextPostMerge.prototype.modifiedLinesInFile = function(filePath) {
  this._modifiedLinesByFile = this._modifiedLinesByFile || {};
  if (!this._modifiedLinesByFile[filePath]) {
    var staged = this.isSquashCommit();
    var refs = this.isMergeCommit() ? 'HEAD^ HEAD' : '';
    this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {refs: refs, staged: staged});
  }

  return this._modifiedLinesByFile[filePath];
};

HookContextPostMerge.prototype.isSquashCommit = function() {
  return (parseInt(this.argv[1]) === 1);
};

HookContextPostMerge.prototype.isMergeCommit = function() {
  return !this.isSquashCommit();
};

module.exports = HookContextPostMerge;
