var HookBase = require('../Base');

function CommitMsgBase(config, context) {
  HookBase.constructor.apply(this, arguments);
}
Object.assign(CommitMsgBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'commitMessage',
  'commitMessageFile',
  'commitMessageLines',
  'isEmptyMessage',
  'updateCommitMessage'
];

CONTEXT_DELEGATIONS.forEach(function(delegateMethod) {
  CommitMsgBase.prototype[delegateMethod] = function() { return this.context[delegateMethod](); }
});

module.exports = CommitMsgBase;
