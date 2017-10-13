'use strict';
const PostCheckoutBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PostCheckoutBase
 * @classdesc Run `nsp check` on repo after a checkout
 */
class NspCheck extends PostCheckoutBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
