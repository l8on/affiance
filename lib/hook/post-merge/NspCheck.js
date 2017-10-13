const PostMergeBase = require('./Base');
const SharedNspCheck = require('../shared/NspCheck');

/**
 * @class NspCheck
 * @extends PostMergeBase
 * @classdesc Run `nsp check` on repo after a merge
 */
class NspCheck extends PostMergeBase {}

// Used the shared run function
NspCheck.prototype.run = SharedNspCheck.run;
module.exports = NspCheck;
