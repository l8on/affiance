var CommitMsgBase = require('./Base');

function EmptyMessage(config, context) {
  CommitMsgBase.prototype.constructor.apply(this, arguments);
}

Object.assign(EmptyMessage.prototype, CommitMsgBase.prototype);

EmptyMessage.prototype.run = function() {
  if (!this.isEmptyMessage()) { return 'pass'; }

  return ['fail', 'Commit message should not be empty'];
};

module.exports = EmptyMessage;
