'use strict';
const path = require('path');
const fse = require('fs-extra');
const glob = require('glob');
const executable = require('executable');
const repoRoot = require('./repoRoot');

module.exports = {
  isBrokenSymlink: function(filePath) {
    let absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    let lstats = fse.lstatSync(absoluteTarget);
    let stats = fse.statSync(absoluteTarget);

    return (lstats.isSymbolicLink() && !stats.size);
  },

  isSymbolicLink: function(filePath) {
    let absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    return fse.lstatSync(absoluteTarget).isSymbolicLink();
  },

  isDirectory: function(filePath) {
    let absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    let stats = fse.statSync(absoluteTarget);
    return stats.isDirectory();
  },

  isFile: function(filePath) {
    let absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    let stats = fse.statSync(absoluteTarget);
    return stats.isFile();
  },

  isExecutable: function(filePath) {
    if (!fse.existsSync(filePath)) { return false; }

    let stats = fse.statSync(this.absolutePath(filePath));
    return executable.checkMode(stats.mode, stats.gid, stats.uid);
  },

  convertGlobToAbsolute: function(glob) {
    return path.join(this.repoRoot(), glob);
  },

  matchesPath: function(pattern, filePath) {
    // TODO: Use minimatch instead of node-glob to be able to match without filesystem access.
    let absoluteTarget = this.absolutePath(filePath);
    let matches = glob.sync(pattern, {dot: true});
    if (!matches || !matches.length) { return false; }

    for (let i in matches) {
      if (matches[i] === absoluteTarget) {
        return true;
      }
    }
    return false;
  },

  modifiedTime: function(filePath) {
    let absoluteTarget = this.absolutePath(filePath);
    let stats = fse.statSync(absoluteTarget);

    return stats.mtime.getTime();
  },

  absolutePath: function(filePath, cwd) {
    if (path.isAbsolute(filePath)) { return filePath; }
    return path.join(cwd || this.repoRoot(), filePath);
  },

  repoRoot: function() {
    if (!this._repoRoot) {
      this._repoRoot = repoRoot();
    }
    return this._repoRoot;
  }
};
