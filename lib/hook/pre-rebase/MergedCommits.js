//TODO: Write tests for this hook
var _ = require('lodash');
var PreRebaseBase = require('./Base');
var gitRepo = require('../../gitRepo');

function MergedCommits(config, context) {
  PreRebaseBase.prototype.constructor.apply(this, arguments);
}

Object.assign(MergedCommits.prototype, PreRebaseBase.prototype);

MergedCommits.prototype.run = function() {
  if (this.isDetachedHead()) { return 'pass'; }

  var illegalCommits = this.illegalCommits();
  if (!illegalCommits.length) { return 'pass'; }

  var message = 'Cannot rebase commits that have already been merged into ' +
                'one of ' + this.branches().join(', ');
  return ['fail', message];
};

MergedCommits.prototype.branches = function() {
  if (!this._branches) {
    this._branches = _.compact(this.config['branches'] || []);
  }
  return this._branches;
};

MergedCommits.prototype.illegalCommits = function() {
  if (!this._illegalCommits) {
    var self = this;
    this._illegalCommits = this.rebasedCommits().filter(function(commitSha1) {
      var branchesWithCommit = gitRepo.branchesContainingCommit(commitSha1);
      return !!(_.intersection(branchesWithCommit, self.branches()).length);
    });
  }
  return this._illegalCommits;
};
