/*eslint no-constant-condition: "off"*/
'use strict';
const AffianceError = require('./error');
const path = require('path');
const fse = require('fs-extra');

module.exports = function() {
  let currRepoRoot = path.resolve('.');
  while (true) {
    // TODO: use OS specific root directory check for Windows support
    let atRootDirectory = (currRepoRoot === '/');

    if (fse.existsSync(path.join(currRepoRoot, '.git'))) {
      return currRepoRoot;
    }

    if (atRootDirectory) {
      throw AffianceError.error(AffianceError.InvalidGitRepo, 'no .git directory found');
    }

    currRepoRoot = path.resolve(currRepoRoot, '..');
  }
};
