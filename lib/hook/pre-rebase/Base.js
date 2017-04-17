var HookBase = require('../Base');

function PreRebaseBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PreRebaseBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'isDetachedHead',
  'isFastForward',
  'rebasedBranch',
  'rebasedCommits',
  'upstreamBranch'
];
HookBase.delegateToContext(PreRebaseBase, CONTEXT_DELEGATIONS);

module.exports = PreRebaseBase;
