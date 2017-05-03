'use strict';
const _ = require('lodash');
const fse = require('fs-extra');
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');

module.exports = class HookContextCommitMsg extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'commit-msg';
    this.hookConfigName = 'CommitMsg';
  }

  isEmptyMessage() {
    return !this.commitMessage().trim();
  }

  commitMessage() {
    return this.commitMessageLines().join('\n');
  }

  commitMessageLines() {
    if(!this._commitMessageLines) {
      this._commitMessageLines = [];
      let rawCommitMessageLines = this.rawCommitMessageLines();
      let commentCharacter = gitRepo.commentCharacter();
      for (let i in rawCommitMessageLines) {
        let line = rawCommitMessageLines[i];
        // Skip lines that are comments.
        if(line[0] === commentCharacter) { continue; }
        // We've reached the diffs displayed in `-v` mode. Stop adding lines.
        if(line.match(/^diff --git/)) { break; }

        this._commitMessageLines.push(line);
      }
    }

    return this._commitMessageLines;
  }

  rawCommitMessageLines() {
    if (!this._rawCommitMessageLines) {
      this._rawCommitMessageLines = [];
      let rawCommitMessage = this.rawCommitMessage();
      if(rawCommitMessage) {
        this._rawCommitMessageLines = rawCommitMessage.split('\n');
      }
    }
    return this._rawCommitMessageLines;
  }

  rawCommitMessage() {
    if (!this._rawCommitMessage) {
      this._rawCommitMessage = fse.readFileSync(this.commitMessageFile(), 'utf8');
    }
    return this._rawCommitMessage;
  }

  commitMessageFile() {
    return this.argv[0];
  }
};
