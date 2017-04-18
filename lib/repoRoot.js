var AffianceError = require('./error');
var path = require('path');
var fse = require('fs-extra');

module.exports = function() {
  var currRepoRoot = path.resolve('.');
  while (true) {
    // TODO: use OS specific root directory check if necessary
    var atRootDirectory = (currRepoRoot === '/');

    if (fse.existsSync(path.join(currRepoRoot, '.git'))) {
      return currRepoRoot;
    }

    if (atRootDirectory) {
      throw AffianceError.error(AffianceError.InvalidGitRepo, 'no .git directory found');
    }

    currRepoRoot = path.resolve(currRepoRoot, '..');
  }
};
