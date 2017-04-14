var HookBase = require('../Base');

function PostRewriteBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostRewriteBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'isAmendment',
  'isRebase',
  'rewrittenCommits'
];
HookBase.delegateToContext(PostMergeBase, CONTEXT_DELEGATIONS);

module.exports = PostRewriteBase;
