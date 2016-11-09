function HookMessage(type, file, line, content) {
  this.type = type;
  this.file = file;
  this.line = line;
  this.content = content;
}

HookMessage.MESSAGE_TYPES = [
  'error',
  'warning'
];

HookMessage.prototype.isError = function() {
  return (this.type === 'error');
};

HookMessage.prototype.isWarning = function() {
  return (this.type === 'warning');
};

module.exports = HookMessage;
