var HookBase = require('../Base');

function CommitMsgBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}
Object.assign(CommitMsgBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'commitMessage',
  'commitMessageFile',
  'commitMessageLines',
  'isEmptyMessage',
  'updateCommitMessage'
];
HookBase.delegateToContext(CommitMsgBase, CONTEXT_DELEGATIONS);

module.exports = CommitMsgBase;
