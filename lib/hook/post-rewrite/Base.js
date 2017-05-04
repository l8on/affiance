'use strict';
const HookBase = require('../Base');

class PostRewriteBase extends HookBase {}
const CONTEXT_DELEGATIONS = [
  'isAmendment',
  'isRebase',
  'rewrittenCommits'
];
HookBase.delegateToContext(PostMergeBase, CONTEXT_DELEGATIONS);

module.exports = PostRewriteBase;
