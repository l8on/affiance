var HookBase = require('../Base');

function PostCheckoutBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostCheckoutBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'previousHead',
  'newHead',
  'isBranchCheckout',
  'isFileCheckout'
];
HookBase.delegateToContext(PostCheckoutBase, CONTEXT_DELEGATIONS);

PostCheckoutBase.prototype.shouldSkipFileCheckout = function() {
  return (this.config['skipFileCheckout'] !== false);
};

PostCheckoutBase.prototype.isEnabled = function() {
  if(this.isFileCheckout() && this.shouldSkipFileCheckout()) {
    return false
  }
  return HookBase.prototype.isEnabled.call(this);
};

module.exports = PostCheckoutBase;
