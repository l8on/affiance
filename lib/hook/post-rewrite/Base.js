'use strict';
const HookBase = require('../Base');

/**
 * @class PostRewriteBase
 * @extends HookBase
 * @classdesc Base class for all Post Rewrite hooks
 */
class PostRewriteBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'isAmendment',
  'isRebase',
  'rewrittenCommits'
];
HookBase.delegateToContext(PostRewriteBase, CONTEXT_DELEGATIONS);

module.exports = PostRewriteBase;
