'use strict';
const gitRepo = require('../gitRepo');
const utils = require('../utils');
const HookContextBase = require('./base');

module.exports = class HookContextPostCommit extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'post-commit';
    this.hookConfigName = 'PostCommit';
    this._isInitialCommit = null;
  }

  modifiedFiles() {
    if (!this._modifiedFiles) {
      let subCommand = 'show --format=%n';
      this._modifiedFiles = gitRepo.modifiedFiles({subCommand: subCommand});
    }

    return this._modifiedFiles;
  }

  modifiedLinesInFile(filePath) {
    this._modifiedLinesByFile = this._modifiedLinesByFile || {};
    if (!this._modifiedLinesByFile[filePath]) {
      let subCommand = 'show --format=%n';
      this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {subCommand: subCommand});
    }

    return this._modifiedLinesByFile[filePath];
  }

  isInitialCommit() {
    if (this._isInitialCommit !== null) { return this._isInitialCommit; }

    return (this._isInitialCommit = !utils.execSync('git rev-parse HEAD~'));
  }
};
