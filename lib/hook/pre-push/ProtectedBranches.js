'use strict';
//TODO: Write tests for this hook
const _ = require('lodash');
const PrePushBase = require('./Base');

/**
 * @class ProtectedBranches
 * @extends PrePushBase
 * @classdesc Protects branches from unwanted advances
 */
module.exports = class ProtectedBranches extends PrePushBase {
  /**
   * Protect specific branches from "illegal" pushes.
   * By default, will reject all pushes on configured branches.
   * If configured to destructiveOnly, it will only block
   * destructive pushes that change git history.
   *
   * @returns {string|string[]} 'pass' or a tuple of 'fail' and output
   */
  run() {
    let illegalPushes = this.illegalPushes();

    if(!illegalPushes.length) { return 'pass'; }
    let messages = illegalPushes.map((pushedRef) => {
      return `Deleting or force-pushing to ${pushedRef.remoteRef} is not allowed.`;
    });

    return ['fail', messages.join('\n')];
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

  /**
   * Checks if a ref is protected by matching remote refs to
   * configured protected branches.
   *
   * @param {PushedRef} remoteRef - the remote reference
   * @returns {boolean} true if remoteRef is protected
   */
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

  /**
   * Produces an array of RegExp's to use to match the remote branch.
   *
   * @returns {RegExp[]}
   */
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

  /**
   * Always returns true unless the `destructiveOnly` configuration is
   * defined and set to true. Otherwise, will return true only if
   * the ref is destructive.
   *
   * @returns {RegExp[]}
   */
  allowNonDestructive(pushedRef) {
    if (this.checkDestructiveOnly()) {
      return pushedRef.isDestructive();
    } else {
      return true;
    }
  }

  /**
   * Returns true if we should only check destructive pushes
   * @returns {boolean|}
   */
  checkDestructiveOnly() {
    return !this.config.hasOwnProperty('destructiveOnly') || !!this.config['destructiveOnly'];
  }
};
