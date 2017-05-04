'use strict';
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');

module.exports = class HookContextPostRewrite extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'post-rewrite';
    this.hookConfigName = 'PostRewrite';
    this._isInitialCommit = null;
  }

  isAmend() {
    return this.argv[0] === 'amend';
  }

  isRebase() {
    return this.argv[0] === 'rebase';
  }

  rewrittenCommits() {
    if (!this._rewrittenCommits) {
      let inputLines = this.inputLines();
      inputLines = inputLines.filter((line) => { return !!line.trim(); } );
      this._rewrittenCommits = inputLines.map((line) => {
        let lineHashes = line.split(' ');
        return { oldHash:lineHashes[0], newHash: lineHashes[1] };
      });
    }
    return this._rewrittenCommits;
  }

  modifiedFiles() {
    if (!this._modifiedFiles) {
      this._modifiedFiles = [];

      this.rewrittenCommits().forEach((rewrittenCommit) => {
        let refs = rewrittenCommit.oldHash + ' ' + rewrittenCommit.newHash;
        this._modifiedFiles = this._modifiedFiles.concat(gitRepo.modifiedFiles({ refs: refs }));
      });

      this._modifiedFiles = this.filterModifiedFiles(this._modifiedFiles);
    }

    return this._modifiedFiles;
  }
};
