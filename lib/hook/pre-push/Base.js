'use strict';
const HookBase = require('../Base');

/**
 * @class PrePushBase
 * @extends HookBase
 * @classdesc Base hook for all pre-push hooks
 */
class PrePushBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'pushedRefs',
  'remoteName',
  'remoteUrl'
];
HookBase.delegateToContext(PrePushBase, CONTEXT_DELEGATIONS);

module.exports = PrePushBase;
