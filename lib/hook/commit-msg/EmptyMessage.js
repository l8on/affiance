'use strict';
const CommitMsgBase = require('./Base');

/**
 * @class EmptyMessage
 * @extends CommitMsgBase
 * @classdesc Ensure commit messages are not empty
 */
module.exports = class EmptyMessage extends CommitMsgBase {
  run() {
    if (!this.isEmptyMessage()) { return 'pass'; }

    return ['fail', 'Commit message should not be empty'];
  }
};
