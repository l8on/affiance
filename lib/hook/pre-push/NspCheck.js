'use strict';
const PrePushBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PrePushBase
 * @classdesc Run `nsp check` on repo before a push
 */
class NspCheck extends PrePushBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
