var HookBase = require('../Base');

function PostRewriteBase(config, context) {
  HookBase.constructor.apply(this, arguments);
}

Object.assign(PostRewriteBase.prototype, HookBase.prototype);

module.exports = PostRewriteBase;
