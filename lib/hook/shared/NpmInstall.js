'use strict';
/**
 * Common run function for each `NpmInstall` hook.
 * Runs `npm install`
 *
 * @this HookBase
 * @returns {string|string[]} 'pass' or a tuple of 'fail' and error output
 */
exports.run = function() {
  let result = this.execute(this.command(), this.flags());
  if (result.status !== 0) {
    return ['fail', result.stderr.toString()];
  }

  return 'pass';
};
