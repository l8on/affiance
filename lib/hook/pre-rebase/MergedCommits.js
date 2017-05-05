'use strict';
//TODO: Write tests for this hook
const _ = require('lodash');
const PreRebaseBase = require('./Base');
const gitRepo = require('../../gitRepo');

/**
 * @class MergedCommits
 * @extends PreRebaseBase
 * @classdesc Does not allow rebases of merged commits
 */
module.exports = class MergedCommits extends PreRebaseBase {
  /**
   * Checks for rebased merge commits on specific branches.
   *
   * @returns {string|string[]}
   */
  run() {
    if (this.isDetachedHead()) { return 'pass'; }

    let illegalCommits = this.illegalCommits();
    if (!illegalCommits.length) { return 'pass'; }

    let message = 'Cannot rebase commits that have already been merged into ' +
      'one of ' + this.branches().join(', ');
    return ['fail', message];
  }

  branches() {
    if (!this._branches) {
      this._branches = _.compact(this.config['branches'] || []);
    }
    return this._branches;
  }

  illegalCommits() {
    if (!this._illegalCommits) {
      let self = this;
      this._illegalCommits = this.rebasedCommits().filter(function(commitSha1) {
        let branchesWithCommit = gitRepo.branchesContainingCommit(commitSha1);
        return !!(_.intersection(branchesWithCommit, self.branches()).length);
      });
    }
    return this._illegalCommits;
  }
};
