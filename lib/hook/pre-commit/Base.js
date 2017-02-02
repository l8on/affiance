var HookBase = require('../Base');

function PreCommitBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PreCommitBase.prototype, HookBase.prototype);

module.exports = PreCommitBase;
