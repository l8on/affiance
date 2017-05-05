'use strict';
const HookBase = require('../Base');

class PrePushBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'pushedRefs',
  'remoteName',
  'remoteUrl'
];
HookBase.delegateToContext(PrePushBase, CONTEXT_DELEGATIONS);

module.exports = PrePushBase;
