'use strict';
const PostMergeBase = require('./Base');
const SharedNpmInstall = require('../shared/NpmInstall');

/**
 * @class NpmInstall
 * @extends PostMergeBase
 * @classdesc Install npm modules after a merge
 */
class NpmInstall extends PostMergeBase {}

// Used the shared run function
NpmInstall.prototype.run = SharedNpmInstall.run;
module.exports = NpmInstall;
