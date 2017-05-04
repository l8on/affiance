'use strict';
const HookBase = require('../Base');

/**
 * @class PostCommitBase
 * @extends HookBase
 * @classdesc The base class for all post commit hooks
 */
class PostCommitBase extends HookBase {}

const CONTEXT_DELEGATIONS = [
  'modifiedLinesInFile',
  'isInitialCommit'
];
HookBase.delegateToContext(PostCommitBase, CONTEXT_DELEGATIONS);

module.exports = PostCommitBase;
