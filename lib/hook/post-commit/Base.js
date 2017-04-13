var HookBase = require('../Base');

function PostCommitBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostCommitBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'modifiedLinesInFile',
  'isInitialCommit'
];
HookBase.delegateToContext(PostCommitBase, CONTEXT_DELEGATIONS);

module.exports = PostCommitBase;
