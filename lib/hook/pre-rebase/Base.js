'use strict';
const HookBase = require('../Base');

class PreRebaseBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'isDetachedHead',
  'isFastForward',
  'rebasedBranch',
  'rebasedCommits',
  'upstreamBranch'
];
HookBase.delegateToContext(PreRebaseBase, CONTEXT_DELEGATIONS);

module.exports = PreRebaseBase;
