var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var utils = require('../utils')
var HookContextBase = require('./base');

function HookContextPostCommit(config, argv, input) {
  HookContextBase.constructor.apply(this, arguments);
  this.hookScriptName = 'post-commit';
  this.hookConfigName = 'PostCommit';
  this._isInitialCommit = null;
}

Object.assign(HookContextPostCommit.prototype, HookContextBase.prototype);

HookContextPostCommit.prototype.modifiedFiles = function() {
  if (!this._modifiedFiles) {
    var subCommand = 'show --format=%n';
    this._modifiedFiles = gitRepo.modifiedFiles({subCommand: subCommand});
  }

  return this._modifiedFiles;
};

HookContextPostCommit.prototype.modifiedLinesInFile = function(filePath) {
  this._modifiedLinesByFile = this._modifiedLinesByFile || {};
  if (!this._modifiedLinesByFile[filePath]) {
    var subCommand = 'show --format=%n';
    this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {subCommand: subCommand});
  }

  return this._modifiedLinesByFile[file];
};

HookContextPostCommit.prototype.isInitialCommit = function() {
  if (this._isInitialCommit !== null) { return this._isInitialCommit; }

  return (this._isInitialCommit = !utils.execSync('git rev-parse HEAD~'));
};

module.exports = HookContextPostCommit;
