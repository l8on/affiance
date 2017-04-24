var PreCommitBase = require('./Base');

function MochaOnly(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(MochaOnly.prototype, PreCommitBase.prototype);

MochaOnly.prototype.run = function() {
  var result = this.executeCommandOnApplicableFiles();
  if (result.stdout.toString().trim()) {
    return ['fail', 'A .only found in mocha test file:\n' + result.stdout.toString()];
  } else {
    return 'pass';
  }
};

module.exports = MochaOnly;
