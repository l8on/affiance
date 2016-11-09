var HookBase = require('../Base');

function PostMergeBase(config, context) {
  HookBase.constructor.apply(this, arguments);
}

Object.assign(PostMergeBase.prototype, HookBase.prototype);

module.exports = PostMergeBase;
