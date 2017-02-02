var HookBase = require('../Base');

function PrePushBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PrePushBase.prototype, HookBase.prototype);

module.exports = PrePushBase;
