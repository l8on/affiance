var PostCheckoutBase = require('./Base');
var SharedNpmInstall = require('../shared/NpmInstall');

function NpmInstall(config, context) {
  PostCheckoutBase.prototype.constructor.apply(this, arguments);
}

Object.assign(NpmInstall.prototype, PostCheckoutBase.prototype);

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
