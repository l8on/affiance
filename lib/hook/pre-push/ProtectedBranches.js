'use strict';
//TODO: Write tests for this hook
const _ = require('lodash');
const PrePushBase = require('./Base');

module.exports = class ProtectedBranches extends PrePushBase {
  /**
   *
   * @returns {string}
   */
  run() {
    let illegalPushes = this.illegalPushes();

    if(!illegalPushes.length) { return 'pass'; }
  }

  /**
   * Get pushes that are "illegal". Generally a force push that changes history.
   *
   * @returns {PushedRef[]}
   */
  illegalPushes() {
    return this.pushedRefs().filter((pushedRef) => {
      return this.isProtected(pushedRef.remoteRef) && this.allowNonDestructive(pushedRef);
    });
  }

  isProtected(remoteRef) {
    let matches = /refs\/heads\/(.*)/.exec(remoteRef);
    let remoteBranch = matches[1];
    let protectedBranchPatterns = this.protectedBranchPatterns();

    for (let i in protectedBranchPatterns) {
      if(remoteBranch.match(protectedBranchPatterns[i])) {
        return true;
      }
    }

    return false;
  }

  protectedBranchPatterns() {
    if (!this._protectedBranchPatterns) {
      this._protectedBranchPatterns = _.compact(
        [].concat(this.config['branches'])
          .concat(this.config['branchPatterns'])
      );

      this._protectedBranchPatterns = this._protectedBranchPatterns.map((branchString) => {
        return new RegExp(branchString);
      });
    }

    return this._protectedBranchPatterns;
  }

  allowNonDestructive(pushedRef) {
    if (this.checkDestructiveOnly()) {
      return pushedRef.isDestructive();
    } else {
      return true;
    }
  }

  checkDestructiveOnly() {
    return !this.config.hasOwnProperty('destructiveOnly') || this.config['destructiveOnly'];
  }
};
