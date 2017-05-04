'use strict';
const HookBase = require('../Base');

/**
 * @class PostCheckoutBase
 * @extends HookBase
 * @classdesc Base class for post-checkout hooks
 */
class PostCheckoutBase extends HookBase {
  shouldSkipFileCheckout() {
    return (this.config['skipFileCheckout'] !== false);
  }

  isEnabled() {
    if(this.isFileCheckout() && this.shouldSkipFileCheckout()) {
      return false;
    }
    return HookBase.prototype.isEnabled.call(this);
  }
}

const CONTEXT_DELEGATIONS = [
  'previousHead',
  'newHead',
  'isBranchCheckout',
  'isFileCheckout'
];
HookBase.delegateToContext(PostCheckoutBase, CONTEXT_DELEGATIONS);

module.exports = PostCheckoutBase;
