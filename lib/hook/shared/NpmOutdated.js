'use strict';
/**
 * Run the npm outdated command
 *
 * @this HookBase
 * @returns {string|string[]}
 */
exports.run = function() {
  let result = this.execute(this.command(), this.flags());
  if (result.status !== 0) {
    return ['warn', result.stderr.toString()];
  }

  if (result.stdout.trim()) {
    console.log('Some npm modules are out of date.');
    console.log(result.stdout.trim());
  }
  return 'pass';
};
