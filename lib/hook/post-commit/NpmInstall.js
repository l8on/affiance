'use strict';
const PostCommitBase = require('./Base');
const SharedNpmInstall = require('../shared/NpmInstall');

/**
 * @class NpmInstall
 * @externds PostCommitBase
 * @classdesc Install npm modules after a commit
 */
class NpmInstall extends PostCommitBase {}

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
