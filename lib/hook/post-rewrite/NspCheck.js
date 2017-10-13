'use strict';
const PostRewriteBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PostRewriteBase
 * @classdesc Run `nsp check` on repo after a rewrite
 */
class NspCheck extends PostRewriteBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
