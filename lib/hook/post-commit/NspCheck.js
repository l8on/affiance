'use strict';
const PostCommitBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PostCommitBase
 * @classdesc Run `nsp check` on repo after a commit
 */
class NspCheck extends PostCommitBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
