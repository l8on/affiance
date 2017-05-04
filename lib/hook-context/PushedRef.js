'use strict';
const DELETED_SHA1 = '0'.repeat(40);
const utils = require('../utils');
const AffianceError = require('../error');

module.exports = class PushedRef {
  constructor(localRef, localSha1, remoteRef, remoteSha1) {
    this.localRef = localRef;
    this.localSha1 = localSha1;
    this.remoteRef = remoteRef;
    this.remoteSha1 = remoteSha1;
  }

  isForced() {
    return !(this.isCreated() || this.isDeleted() || this.overwrittenCommits().length === 0);
  }

  isCreated() {
    return (this.remoteSha1 === DELETED_SHA1);
  }

  isDeleted() {
    return (this.localSha1 === DELETED_SHA1);
  }

  isDestructive() {
    return (this.isDeleted() || this.isForced());
  }

  toString() {
    return [this.localRef, this.localSha1, this.remoteRef, this.remoteSha1].join(' ');
  }

  overwrittenCommits() {
    if (!this._overwrittenCommits) {
      this._overwrittenCommits = [];
      let commandResult = utils.execSync(['git', 'rev-list', this.remoteSha1, '^' + this.localSha1].join(' '));
      if(commandResult === false) {
        throw AffianceError.error(
          AffianceError.GitRevListError,
          'Unable to check if commits on the remote ref will be overwritten by push'
        );
      }

      this._overwrittenCommits = commandResult.trim().split('\n');
    }

    return this._overwrittenCommits;
  }
};
