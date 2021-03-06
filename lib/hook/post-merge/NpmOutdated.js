const PostMergeBase = require('./Base');
const SharedNpmOutdated = require('../shared/NpmOutdated');

/**
 * @class NpmOutdated
 * @extends PostMergeBase
 * @classdesc Run `npm outdated` if included files change
 *   By default, the included files are `package.json` and `npm-shrinkwrap.json`
 */
class NpmOutdated extends PostMergeBase {}

// Used the shared run function
NpmOutdated.prototype.run = SharedNpmOutdated.run;
module.exports = NpmOutdated;
