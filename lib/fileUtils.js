var path = require('path');
var fse = require('fs-extra');
var glob = require('glob');
var executable = require('executable');
var gitRepo = require('./gitRepo');

module.exports = {

  isBrokenSymlink: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);

    var lstats = fse.lstatSync(absoluteTarget);
    var stats = fse.statSync(absoluteTarget);

    return (lstats.isSymbolicLink() && !stats.size);
  },

  isSymbolicLink: function(filePath) {
    var absoluteTarget = this.absolutePath(filePath);

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
    var stats = fse.statSync(this.absolutePath(filePath));
    return executable.checkMode(stats.mode, stats.gid, stats.uid);
  },

  convertGlobToAbsolute: function(glob) {
    return path.join(this._repoRoot(), glob);
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
    return path.join(cwd || this._repoRoot(), filePath);
  },

  _repoRoot: function() {
    return gitRepo.repoRoot();
  }
};
