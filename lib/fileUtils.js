var path = require('path');
var fse = require('fs-extra');
var glob = require('glob');
var executable = require('executable');
var gitRepo = require('./gitRepo');
var repoRoot = require('./repoRoot');

module.exports = {
  isBrokenSymlink: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    var lstats = fse.lstatSync(absoluteTarget);
    var stats = fse.statSync(absoluteTarget);

    return (lstats.isSymbolicLink() && !stats.size);
  },

  isSymbolicLink: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    return fse.lstatSync(absoluteTarget).isSymbolicLink();
  },

  isDirectory: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    var stats = fse.statSync(absoluteTarget);
    return stats.isDirectory();
  },

  isFile: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);
    if (!fse.existsSync(absoluteTarget)) { return false; }

    var stats = fse.statSync(absoluteTarget);
    return stats.isFile();
  },

  isExecutable: function(filePath) {
    if (!fse.existsSync(filePath)) { return false; }

    var stats = fse.statSync(this.absolutePath(filePath));
    return executable.checkMode(stats.mode, stats.gid, stats.uid);
  },

  convertGlobToAbsolute: function(glob) {
    return path.join(this.repoRoot(), glob);
  },

  matchesPath: function(pattern, path) {
    var matches = glob.sync(pattern, {dot: true});
    return !!(matches && matches.length);
  },

  modifiedTime: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);
    var stats = fse.statSync(absoluteTarget);

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
