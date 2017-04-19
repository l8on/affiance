var PostMergeBase = require('./Base');
var SharedNpmInstall = require('../shared/NpmInstall');

function NpmInstall(config, context) {
  PostMergeBase.prototype.constructor.apply(this, arguments);
}

Object.assign(NpmInstall.prototype, PostMergeBase.prototype);

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
