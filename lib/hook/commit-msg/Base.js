'use strict';
const HookBase = require('../Base');

/**
 * @class CommitMsgBase
 * @extends HookBase
 * @classdesc The base class for all commit msg hooks
 */
class CommitMsgBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'commitMessage',
  'commitMessageFile',
  'commitMessageLines',
  'isEmptyMessage',
  'updateCommitMessage'
];
HookBase.delegateToContext(CommitMsgBase, CONTEXT_DELEGATIONS);

module.exports = CommitMsgBase;
