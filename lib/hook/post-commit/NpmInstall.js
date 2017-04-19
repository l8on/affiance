var PostCommitBase = require('./Base');
var SharedNpmInstall = require('../shared/NpmInstall');

function NpmInstall(config, context) {
  PostCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(NpmInstall.prototype, PostCommitBase.prototype);

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
