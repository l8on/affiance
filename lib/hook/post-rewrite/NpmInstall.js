'use strict';
const PostRewriteBase = require('./Base');
const SharedNpmInstall = require('../shared/NpmInstall');

/**
 * @class NpmInstall
 * @extends PostRewriteBase
 * @classdesc Install npm modules after a merge
 */
class NpmInstall extends PostRewriteBase {}

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
