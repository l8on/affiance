'use strict';
/**
 * Run the nsp check command
 *
 * @this HookBase
 * @returns {string|string[]}
 */
exports.run = function() {
  let result = this.execute(this.command(), this.flags());
  if (result.status !== 0) {
    return ['fail', result.stderr.toString()];
  }

  return 'pass';
};
