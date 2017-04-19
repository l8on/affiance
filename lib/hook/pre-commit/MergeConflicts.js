var PreCommitBase = require('./Base');

function MergeConflicts(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(MergeConflicts.prototype, PreCommitBase.prototype);

MergeConflicts.prototype.run = function() {
  var result = this.executeCommandOnApplicableFiles();
  if (result.stdout.toString().trim()) {
    return ['fail', 'Merge conflict markers detected:\n' + result.stdout.toString()];
  } else {
    return 'pass';
  }
};

module.exports = MergeConflicts;
