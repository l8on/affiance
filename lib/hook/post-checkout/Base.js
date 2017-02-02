var HookBase = require('../Base');

function PostCheckoutBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostCheckoutBase.prototype, HookBase.prototype);

module.exports = PostCheckoutBase;
