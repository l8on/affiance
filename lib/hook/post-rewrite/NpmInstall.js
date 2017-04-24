var PostRewriteBase = require('./Base');
var SharedNpmInstall = require('../shared/NpmInstall');

function NpmInstall(config, context) {
  PostRewriteBase.prototype.constructor.apply(this, arguments);
}

Object.assign(NpmInstall.prototype, PostRewriteBase.prototype);

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
