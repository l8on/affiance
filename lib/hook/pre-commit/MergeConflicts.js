'use strict';
var PreCommitBase = require('./Base');

function MergeConflicts(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(MergeConflicts.prototype, PreCommitBase.prototype);

MergeConflicts.prototype.run = function() {
  return new Promise((resolve, reject) => {
    this.spawnConcurrentCommandsOnApplicableFiles().then((result) => {
      if (result.stdout.toString().trim()) {
        return resolve(['fail', 'Merge conflict markers detected:\n' + result.stdout.toString()]);
      } else {
        return resolve('pass');
      }
    }, reject);
  });
};

module.exports = MergeConflicts;
