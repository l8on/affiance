var HookBase = require('../Base');

function PostCommitBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PostCommitBase.prototype, HookBase.prototype);

module.exports = PostCommitBase;
