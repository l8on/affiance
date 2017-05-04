'use strict';
const CommitMsgBase = require('./Base');

/**
 * @class EmptyMessage
 * @extends CommitMsgBase
 * @classdesc Ensure commit messages are not empty
 */
module.exports = class EmptyMessage extends CommitMsgBase {
  constructor(config, context) {
    super(config, context);
  }

  run() {
    if (!this.isEmptyMessage()) { return 'pass'; }

    return ['fail', 'Commit message should not be empty'];
  }
};
