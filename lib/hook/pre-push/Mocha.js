'use strict';
//TODO: Write tests for this hook
const PrePushBase = require('./Base');

/**
 * @class Mocha
 * @extends PrePushBase
 * @classdesc Run mocha test suite before pushing
 */
module.exports = class Mocha extends PrePushBase {
  /**
   * Run mocha test suite before pushing.
   * Executes the tests synchronously.
   * @returns {string|string[]} 'pass' or a touple of 'fail' and a 'warning'
   */
  run() {
    let result = this.execute(this.command(), this.flags());
    if (result.status === 0) { return 'pass'; }

    let allOutput = result.stdout.toString() + result.stderr.toString();
    return ['fail', allOutput];
  }
};
