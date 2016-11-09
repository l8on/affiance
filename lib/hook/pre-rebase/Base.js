var HookBase = require('../Base');

function PreRebaseBase(config, context) {
  HookBase.constructor.apply(this, arguments);
}

Object.assign(PreRebaseBase.prototype, HookBase.prototype);

module.exports = PreRebaseBase;
