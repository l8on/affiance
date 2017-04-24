//TODO: Write tests for this hook
var _ = require('lodash');
var PrePushBase = require('./Base');

function ProtectedBranches(config, context) {
  PrePushBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PrePushBase.prototype, ProtectedBranches.prototype);

ProtectedBranches.prototype.run = function() {
  var illegalPushes = this.illegalPushes();

  if(!illegalPushes.length) { return 'pass'; }
};

ProtectedBranches.prototype.illegalPushes = function() {
  var self = this;
  return this.pushedRefs().filter(function(pushedRef) {
    return self.isProtected(pushedRef.remoteRef) && self.allowNonDestructive(pushedRef)
  });
};

ProtectedBranches.prototype.isProtected = function(remoteRef) {
  var matches = /refs\/heads\/(.*)/.exec(remoteRef);
  var remoteBranch = matches[1];
  var protectedBranchPatterns = this.protectedBranchPatterns();

  for (var i in protectedBranchPatterns) {
    if(remoteBranch.match(protectedBranchPatterns[i])) {
      return true;
    }
  }

  return false;
};

ProtectedBranches.prototype.protectedBranchPatterns =  function() {
  if (!this._protectedBranchPatterns) {
    this._protectedBranchPatterns = _.compact(
      [].concat(this.config['branches'])
        .concat(this.config['branchPatterns'])
    );

    this._protectedBranchPatterns = this._protectedBranchPatterns.map(function(branchString) {
      return new RegExp(branchString);
    });
  }
  
  return this._protectedBranchPatterns;
};

ProtectedBranches.prototype.allowNonDestructive = function(pushedRef) {
  if (this.checkDestructiveOnly()) {
    return pushedRef.isDestructive();
  } else {
    return true;
  }
};

ProtectedBranches.prototype.checkDestructiveOnly = function() {
  return !this.config.hasOwnProperty('destructiveOnly') || this.config['destructiveOnly'];
};

module.exports = ProtectedBranches;
