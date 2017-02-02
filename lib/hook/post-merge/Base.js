var HookBase = require('../Base');

function PostMergeBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostMergeBase.prototype, HookBase.prototype);

module.exports = PostMergeBase;
