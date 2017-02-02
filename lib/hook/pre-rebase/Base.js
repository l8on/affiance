var HookBase = require('../Base');

function PreRebaseBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PreRebaseBase.prototype, HookBase.prototype);

module.exports = PreRebaseBase;
