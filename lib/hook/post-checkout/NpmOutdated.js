'use strict';
const PostCheckoutBase = require('./Base');
const SharedNpmOutdated = require('../shared/NpmOutdated');

/**
 * @class NpmOutdated
 * @extends PostCheckoutBase
 * @classdesc Run `npm update` if included files change
 *   By default, the included files are `package.json` and `npm-shrinkwrap.json`
 */
class NpmOutdated extends PostCheckoutBase {}

// Used the shared run function
NpmOutdated.prototype.run = SharedNpmOutdated.run;
module.exports = NpmOutdated;
