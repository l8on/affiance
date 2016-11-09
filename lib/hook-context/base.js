var fse = require('fs-extra');
var childProcess = require('child_process');
var fileUtils = require('../fileUtils');
var gitRepo = require('../gitRepo');

// The base class for Hook context.
// The constuctor saves the values to the instance.
// The methods on the prototype are useful for all hook contexts.
//
// @param config [Config] the affiance Config object.
// @param argv [Array] the array of arguments provided to the hook binary
// @param input [Readable] the readable input stream (usually stdin).
function HookContextBase(config, argv, input) {
  this.config = config;
  this.argv = argv;
  this.input = input;
}

// Executes a command like a standard git hook; providing the
// args and stdin.
//
// This is intended to be used for custom hooks that allow
// users to define arbitrary hooks to run from the repo.
HookContextBase.prototype.executeHook = function (command, extraArgs) {
  extraArgs = extraArgs || [];
  return childProcess.spawnSync(command, this.argv.slice(1).concat(extraArgs), {
    stdio: [
      this.input, //Use parent input for `stdin`
      'pipe', //Pipe output to `stdin`
      'pipe' //Pipe errors to `stdin`
    ]
  });
};

// Initializes anything related to the env.
//
// This will be called before the hooks run.
// A stub is defined here, but subclasses can set up
// the environment as necesary.
//
HookContextBase.prototype.setupEnvironment = function () {};

// Cleans up any setup done to environment.
//
// This will be called after the hooks have been run.
// Intended to undo `setupEnvironment` side effects.
HookContextBase.prototype.cleanupEnvironment = function () {};

// Returns a list of modified files.
//
// Returns an empty list of files. Subclasses should
// implement if there is a concept of changing files for
// that type of hook.
HookContextBase.prototype.modifiedFiles = function() {
  return [];
};

HookContextBase.prototype.filterModifiedFiles = function(modifiedFiles) {
  return this.filterDirectories(this.filterNonexistent(modifiedFiles));
};

HookContextBase.prototype.filterNonexistent = function(modifiedFiles) {
  return modifiedFiles.filter(function(file) {
    return fse.existsSync(file) || fileUtils.isBrokenSymlink(file);
  });
};

HookContextBase.prototype.filterDirectories = function(modifiedFiles) {
  return modifiedFiles.filter(function(file) {
    return !fileUtils.isDirectory(file) || fileUtils.isSymbolicLink(file);
  });
};

// Returns a list of all of the files tracked by git.
//
HookContextBase.prototype.allFiles = function() {
  return gitRepo.allFiles();
};

HookContextBase.prototype.inputString = function() {
  if (!this._inputString) {
    var size = fse.fstatSync(this.input.fd).size;

    if (size === 0) {
      this._inputString = '';
    } else {
      var buffer = Buffer.from('');
      fse.readSync(this.input.fd, buffer, 0, size, 0);
      this._inputString = buffer.toString();
    }
  }

  return this._inputString;
};

HookContextBase.prototype.inputLines = function() {
  if(!this._inputLines) {
    this._inputLines = this.inputString().split("\n");
  }
  return this._inputLines;
};

module.exports = HookContextBase;



