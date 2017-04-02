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

CONTEXT_DELEGATIONS.forEach(function(delegateMethod) {
  PostCheckoutBase.prototype[delegateMethod] = function() { return this.context[delegateMethod](); }
});


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
