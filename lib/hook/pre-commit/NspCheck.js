'use strict';
const PreCommitBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PreCommitBase
 * @classdesc Run `nsp check` on repo before a commit
 */
class NspCheck extends PreCommitBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
