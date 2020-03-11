'use strict';
const _ = require('lodash');
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');
const utils = require('../utils');

module.exports = class HookContextRunAll extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'pre-commit';
    this.hookConfigName = 'PreCommit';
  }

  setupEnvironment() {}

  // Restore unstaged changes and reset file modification times so it appears
  // as if nothing ever changed.
  //
  // We want to restore the modification times for each of the files after
  // every step to ensure as little time as possible has passed while the
  // modification time on the file was newer. This helps us play more nicely
  // with file watchers.
  cleanupEnvironment() {}

  modifiedFiles() {
    if (!this._modifiedFiles) {
      this._modifiedFiles = gitRepo.allFiles();
    }

    return this._modifiedFiles;
  }

  modifiedLinesInFile(filePath) {
    this._modifiedLinesByFile = this._modifiedLinesByFile || {};

    if (!this._modifiedLinesByFile[filePath]) {
      let lineCount = this._getLineCount(filePath);
      this._modifiedLinesByFile[filePath] = _.times(lineCount, function(index) {
        return '' + (index + 1);
      });
    }

    return this._modifiedLinesByFile[filePath];
  }

  _getLineCount(filePath) {
    let rawLineCount = utils.execSync(`wc -l ${filePath}`);
    if (!rawLineCount) {
      return 0;
    }
    return parseInt(rawLineCount.trim().split(/\s/)[0], 10);
  }
};
