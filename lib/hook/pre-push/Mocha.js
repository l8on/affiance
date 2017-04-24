//TODO: Write tests for this hook
var PrePushBase = require('./Base');

function Mocha(config, context) {
  PrePushBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PrePushBase.prototype, Mocha.prototype);

Mocha.prototype.run = function() {
  var result = this.execute(this.command(), this.flags());
  if (result.status === 0) { return 'pass'; }

  var allOutput = result.stdout.toString() + result.stderr.toString();
  return ['fail', allOutput];
};
