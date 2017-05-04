'use strict';
const PostCheckoutBase = require('./Base');
const SharedNpmInstall = require('../shared/NpmInstall');

/**
 * @class NpmInstall
 * @extends PostCheckoutBase
 * @classdesc Run `npm install` if included files change
 *   By default, the included files are `package.json` and `npm-shrinkwrap.json`
 */
class NpmInstall extends PostCheckoutBase {}

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
