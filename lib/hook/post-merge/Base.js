var HookBase = require('../Base');

function PostMergeBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostMergeBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'isSquashCommit',
  'isMergeCommit',
  'modifiedLinesInFile'
];
HookBase.delegateToContext(PostMergeBase, CONTEXT_DELEGATIONS);

module.exports = PostMergeBase;
