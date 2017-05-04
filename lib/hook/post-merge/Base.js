'use strict';
const HookBase = require('../Base');

/**
 * @class PostMergeBase
 * @extends HookBase
 * @classdesc Base class for all post-merge hooks
 */
class PostMergeBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'isSquashCommit',
  'isMergeCommit',
  'modifiedLinesInFile'
];
HookBase.delegateToContext(PostMergeBase, CONTEXT_DELEGATIONS);

module.exports = PostMergeBase;
