var HookBase = require('../Base');

function PrePushBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PrePushBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'pushedRefs',
  'remoteName',
  'remoteUrl'
];
HookBase.delegateToContext(PrePushBase, CONTEXT_DELEGATIONS);

module.exports = PrePushBase;
