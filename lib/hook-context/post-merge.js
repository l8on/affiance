'use strict';
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');

module.exports = class HookContextPostMerge extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'post-merge';
    this.hookConfigName = 'PostMerge';
    this._isInitialCommit = null;
  }

  modifiedFiles() {
    if (!this._modifiedFiles) {
      let staged = this.isSquashCommit();
      let refs = this.isMergeCommit() ? 'HEAD^ HEAD' : '';
      this._modifiedFiles = gitRepo.modifiedFiles({refs: refs, staged: staged});
    }

    return this._modifiedFiles;
  }

  modifiedLinesInFile(filePath) {
    this._modifiedLinesByFile = this._modifiedLinesByFile || {};
    if (!this._modifiedLinesByFile[filePath]) {
      let staged = this.isSquashCommit();
      let refs = this.isMergeCommit() ? 'HEAD^ HEAD' : '';
      this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {refs: refs, staged: staged});
    }

    return this._modifiedLinesByFile[filePath];
  }

  isSquashCommit() {
    return (parseInt(this.argv[0]) === 1);
  }

  isMergeCommit() {
    return !this.isSquashCommit();
  }
};
