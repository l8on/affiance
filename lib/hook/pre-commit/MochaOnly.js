'use strict';
var PreCommitBase = require('./Base');

function MochaOnly(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(MochaOnly.prototype, PreCommitBase.prototype);

MochaOnly.prototype.run = function() {
  return new Promise((resolve, reject) => {
    this.spawnPromiseOnApplicableFiles().then((result) => {
      if (result.stdout.toString().trim()) {
        return resolve(['fail', 'A .only found in mocha test file:\n' + result.stdout.toString()]);
      } else {
        return resolve('pass');
      }
    }, reject);
  });
};

module.exports = MochaOnly;
