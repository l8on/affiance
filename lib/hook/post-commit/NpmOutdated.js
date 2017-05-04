'use strict';
const PostCommitBase = require('./Base');
const SharedNpmOutdated = require('../shared/NpmOutdated');

/**
 * @class NpmOutdated
 * @extends PostCommitBase
 * @classdesc Run `npm update` if included files change
 *   By default, the included files are `package.json` and `npm-shrinkwrap.json`
 */
class NpmOutdated extends PostCommitBase {}

// Used the shared run function
NpmOutdated.prototype.run = SharedNpmOutdated.run;
module.exports = NpmOutdated;
