var _ = require('lodash');
var fse = require('fs-extra');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');

function HookContextCommitMsg(config, argv, input) {
  HookContextBase.constructor.apply(this, arguments);
  this.hookScriptName = 'commit-msg';
  this.hookConfigName = 'CommitMsg';
}

HookContextCommitMsg.prototype = _.create(HookContextBase.prototype, { constructor: HookContextCommitMsg });

Object.assign(HookContextCommitMsg.prototype, HookContextBase.prototype);

HookContextCommitMsg.prototype.isEmptyMessage = function() {
  return !this.commitMessage().trim();
};

HookContextCommitMsg.prototype.commitMessage = function() {
  return this.commitMessageLines().join("\n");
};

HookContextCommitMsg.prototype.commitMessageLines = function() {
  if(!this._commitMessageLines) {
    this._commitMessageLines = [];
    var rawCommitMessageLines = this.rawCommitMessageLines();
    var commentCharacter = gitRepo.commentCharacter();
    for (var i in rawCommitMessageLines) {
      var line = rawCommitMessageLines[i];
      // Skip lines that are comments.
      if(line[0] === commentCharacter) { continue; }
      // We've reached the diffs displayed in `-v` mode. Stop adding lines.
      if(line.match(/^diff --git/)) { break; }

      this._commitMessageLines.push(line);
    }
  }

  return this._commitMessageLines;
};

HookContextCommitMsg.prototype.rawCommitMessageLines = function() {
  if (!this._rawCommitMessageLines) {
    this._rawCommitMessageLines = [];
    var rawCommitMessage = this.rawCommitMessage();
    if(rawCommitMessage) {
      this._rawCommitMessageLines = rawCommitMessage.split("\n");
    }
  }
  return this._rawCommitMessageLines;
};

HookContextCommitMsg.prototype.rawCommitMessage = function() {
  if (!this._rawCommitMessage) {
    this._rawCommitMessage = fse.readFileSync(this.commitMessageFile(), 'utf8');
  }
  return this._rawCommitMessage;
};

HookContextCommitMsg.prototype.commitMessageFile = function() {
  return this.argv[1];
};


module.exports = HookContextCommitMsg;

