'use strict';
const PreCommitBase = require('./Base');

module.exports = class MergeConflicts extends PreCommitBase {
  /**
   * Use grep to check for merge conflicts
   * Uses spawnPromiseOnApplicableFiles to parallelize
   *
   * @returns {Promise}
   * @resolves {string|string[]} 'pass' or a tuple of 'fail' and a message
   * @rejects {Error} An Error thrown or emitted while running the hook
   */
  run() {
    return new Promise((resolve, reject) => {
      this.spawnPromiseOnApplicableFiles().then((result) => {
        if (result.stdout.toString().trim()) {
          return resolve(['fail', `Merge conflict markers detected:\n${result.stdout.toString()}`]);
        } else {
          return resolve('pass');
        }
      }, reject);
    });
  }
};
