var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');
var utils = require('../utils');
var fileUtils = require('../fileUtils');
var AffianceError = require('../error');

function HookContextPrePush(config, argv, input) {
  HookContextBase.prototype.constructor.apply(this, arguments);
  this.hookScriptName = 'pre-push';
  this.hookConfigName = 'PrePush';
}

Object.assign(HookContextPrePush.prototype, HookContextBase.prototype);

HookContextPrePush.prototype.remoteName = function() {
  return this.argv[0];
};

HookContextPrePush.prototype.remoteUrl = function() {
  return this.argv[1];
};

HookContextPrePush.prototype.pushedRefs = function() {
  return this.inputLines().map(function(inputLine) {
    var pushParts = inputLine.split(' ');
    return new PushedRef(pushParts[0], pushParts[1], pushParts[2], pushParts[3]);
  });
};


function PushedRef(localRef, localSha1, remoteRef, remoteSha1) {
  this.localRef = localRef;
  this.localSha1 = localSha1;
  this.remoteRef = remoteRef;
  this.remoteSha1 = remoteSha1;
}

PushedRef.DELETED_SHA1 = '0'.repeat(40);

PushedRef.prototype.isForced = function() {
  return !(this.isCreated() || this.isDeleted() || this.overwrittenCommits().length === 0);
};

PushedRef.prototype.isCreated = function () {
  return (this.remoteSha1 === PushedRef.DELETED_SHA1);
};

PushedRef.prototype.isDeleted = function () {
  return (this.localSha1 === PushedRef.DELETED_SHA1);
};

PushedRef.prototype.isDestructive = function () {
  return (this.isDeleted() || this.isForced());
};

PushedRef.prototype.toString = function() {
  return [this.localRef, this.localSha1, this.remoteRef, this.remoteSha1].join(' ');
};

PushedRef.prototype.overwrittenCommits = function() {
  if (!this._overwrittenCommits) {
    this._overwrittenCommits = [];
    var commandResult = utils.execSync(['git', 'rev-list', this.remoteSha1, '^' + this.localSha1].join(' '));
    if(commandResult === false) {
      throw AffianceError.error(
        AffianceError.GitRevListError,
        "Unable to check if commits on the remote ref will be overwritten by push"
      )
    }

    this._overwrittenCommits = commandResult.trim().split("\n");
  }

  return this._overwrittenCommits;
};


HookContextPrePush.PushedRef = PushedRef;
module.exports = HookContextPrePush;



