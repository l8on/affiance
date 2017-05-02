var _ = require('lodash');
var fse = require('fs-extra');
var path = require('path');
var ini = require('ini');
var semver = require('semver');
var fileUtils = require('./fileUtils');
var utils = require('./utils');
var repoRoot = require('./repoRoot');

function SubmoduleStatus(prefix, sha1, path, describe) {
  this.prefix = prefix;
  this.sha1 = sha1;
  this.path = path;
  this.describe = describe;
}

SubmoduleStatus.prototype.isUninitialized = function() {
  return this.prefix === '-';
};

SubmoduleStatus.prototype.isOutdated = function() {
  return this.prefix === '+';
};

SubmoduleStatus.prototype.hasMergeConflict = function() {
  return this.prefix === 'U';
};


var SUBMODULE_STATUS_REGEX = /^\s*([-+U]?)(\w+)\s([^\s]+?)(?:\s\((.+)\))?$/gm;
var SUBMODULE_MATCHES = {
  prefix: 1,
  sha1: 2,
  path: 3,
  describe: 4
};

module.exports = {
  gitVersion: function() {
    if (!this._gitVersion) {
      var commandResults;
      if (commandResults = utils.execSync('git --version')) {
        var matches = /\d+(\.\d+)+/.exec(commandResults);
        this._gitVersion = matches[0];
      } else {
        utils.logger.debug('Could not get git version.');
      }
    }

    return this._gitVersion;
  },

  DIFF_HUNK_REGEX: new RegExp(
    '^@@\\s' +
    '[^\\s]+\\s' + //Ignore old file range
    '\\+(\\d+)(?:,(\\d+))?' + // Extract range of hunk containing start line and number of lines
    '\\s@@.*$',
    'gm'),

  commentCharacter: function() {
    var result = utils.spawnSync('git', ['config', '--get', 'core.commentchar']);
    var commentChar = (result.status !== 0) ? '' : result.stdout.toString().trim();
    if (commentChar) { return commentChar; }

    return '#';
  },

  mergeState: function() {
    var mergeState = {
      mergeHead: null,
      mergeMsg: null
    };

    var result = utils.spawnSync('git', ['rev-parse', 'MERGE_HEAD']);
    var currMergeHead = result.stdout.toString().trim();
    if (currMergeHead !== 'MERGE_HEAD') {
      mergeState.mergeHead = currMergeHead;
    }

    var mergeMsgPath = this.gitDir(this.repoRoot()) + '/MERGE_MSG';
    if (fileUtils.isFile(mergeMsgPath)) {
      mergeState.mergeMsg = fse.readFileSync(mergeMsgPath, 'utf8');
    }
    return mergeState;
  },

  cherryPickState: function() {
    var cherryPickState = {
      cherryPickHead: null
    };

    var result = utils.spawnSync('git', ['rev-parse', 'CHERRY_PICK_HEAD']);
    var currCherryPickHead = result.stdout.toString().trim();
    if (currCherryPickHead !== 'CHERRY_PICK_HEAD') {
      cherryPickState.cherryPickHead = currCherryPickHead;
    }

    return cherryPickState;
  },

  allFiles: function() {
    var gitLsResults = utils.execSync('git ls-files');
    var gitLsResultLines = gitLsResults.split("\n");
    var allFiles = [];

    for (var i in gitLsResultLines) {
      var line = gitLsResultLines[i];
      var currAbsPath = path.resolve(this.repoRoot(), line);
      // Do not return  directories.
      if (fileUtils.isDirectory(currAbsPath)) { continue; }

      allFiles.push(currAbsPath);
    }

    return allFiles;
  },

  modifiedFiles: function(options) {
    options = options || {};

    var flags = '';
    if (options.staged) { flags = '--cached'; }

    var refs = options.refs || '';
    var subCommand = options.subCommand || 'diff';
    var command = 'git ' + subCommand + ' --name-only -z --diff-filter=ACMR --ignore-submodules=all ' + flags + ' ' + refs;
    var commandResults = utils.execSync(command);

    var rawModifiedFiles = commandResults.split("\0");
    var modifiedFiles = [];
    for (var i in rawModifiedFiles) {
      var rawModifiedFile = rawModifiedFiles[i].trim();
      if(!rawModifiedFile) { continue; }

      modifiedFiles.push(path.resolve(rawModifiedFile));
    }

    return modifiedFiles;
  },

  listFiles: function(paths, options) {
    paths = paths || [];
    options = options || {};

    var ref = options.ref || 'HEAD';
    var commandResults = utils.execSync(
      'git ls-tree --name-only ' +
      ref + ' ' +
      '"' + paths.join('" "') + '"'
    );
    if (!commandResults) { return []; }

    var relativePaths = commandResults.split("\n");
    var outputPaths = [];
    var self = this;

    relativePaths.forEach(function(relativePath) {
      var absPath = path.resolve(self.repoRoot(), relativePath);
      if (fileUtils.isDirectory(absPath)) {return;}

      outputPaths.push(absPath);
    });

    return outputPaths;
  },

  isTracked: function(path) {
    return utils.execSync('git ls-files ' + path + ' --error-unmatch 2>&1 > /dev/null') !== false;
  },

  extractModifiedLines: function(filePath, options) {
    options = options || {};
    var lineMap = {};
    var flags = options.staged ? '--cached' : '';
    var refs = options.refs || '';
    var subCommand = options.subCommand || 'diff';
    var command = 'git ' + subCommand + ' --no-color --no-ext-diff -U0 ' + flags + ' ' + refs + ' -- "' + filePath + '"';
    var commandResults = utils.execSync(command);

    this.DIFF_HUNK_REGEX.lastIndex = 0;
    var matches = null;

    while(matches = this.DIFF_HUNK_REGEX.exec(commandResults)) {
      var startLine = matches[1];
      var linesAdded = parseInt(matches[2] || 1);

      var currentLine = startLine;
      for(var i = 0; i < linesAdded; i++) {
        lineMap['' + currentLine] = true;
        currentLine++;
      }
    }

    return Object.keys(lineMap);
  },

  repoRoot: function() {
    if (!this._repoRoot) {
      this._repoRoot = repoRoot();
    }
    return this._repoRoot;
  },

  gitDir: function(repoDir) {
    if(!repoDir) { repoDir = this.repoRoot(); }

    if(!this._gitDir || !this._lastGitDirRepoRoot !== repoDir) {
      this._lastGitDirRepoRoot = repoDir;

      var gitDir = path.join(repoDir, '.git');
      if(!fse.existsSync(gitDir)) {
        throw AffianceError.error(AffianceError.InvalidGitRepo, 'no .git directory found');
      }
      // .git could reference a text file that has the actual git file location.
      var stats = fse.statSync(gitDir);
      if(!stats.isDirectory()) {
        var gitFileContents = fse.readFileSync(girDir, 'utf8');
        var gitDirRegex = /^gitdir: (.*)$/g;
        var dirMatches = gitDirRegex.exec(gitFileContents);
        if(!dirMatches) {
          throw AffianceError.error(AffianceError.InvalidGitRepo, 'no .git directory found');
        }

        gitDir = dirMatches[1];
        // Resolve relative path if necessary
        if(gitDir[0] != '/') {
          gitDir = path.resolve(path.join(repoDir, gitDir));
        }
      }

      this._gitDir = gitDir;
    }

    return this._gitDir;
  },

  isInitialCommit: function() {
    return !utils.execSync('git rev-parse HEAD');
  },

  stagedSubmoduleRemovals: function() {
    var commandResults = utils.execSync('git ls-files .gitmodules');
    if (!commandResults) { return []; }

    var previousSubmodules = this.submodules({ref: 'HEAD'});
    var currSubmodules = this.submodules();

    return _.differenceBy(previousSubmodules, currSubmodules, 'path');
  },

  submodules: function(options) {
    options = options || {};
    var ref = options.ref || '';

    var submodules = [];
    var commandResults = utils.execSync('git show ' + ref + ':.gitmodules');
    if (!commandResults) { return []; }

    var parsedIni = ini.parse(commandResults);
    for (var i in parsedIni) {
      var section = parsedIni[i];

      // git < 1.8.5 does not update the .gitmodules file with submodule
      // changes, so when we are looking at the current state of the work tree,
      // we need to check if the submodule actually exists via another method,
      // since the .gitmodules file we parsed does not represent reality.
      if (!ref && semver.lt(this.gitVersion(), '1.8.5')) {
        var subCommandResults = utils.execSync('git submodule status "' + section.path +'"');
        if (!subCommandResults) { continue; }
      }

      submodules.push({path: section.path, url: section.url});
    }

    return submodules;
  },

  submoduleStatuses: function(options) {
    options = options || {};
    var flags = '';
    if (options.recursive) {
      flags = ' --recursive';
    }

    var command = 'git submodule status' + flags;
    var commandResults = utils.execSync(command).trim();
    if (!commandResults) { return []; }

    var submoduleStatuses = [];
    SUBMODULE_STATUS_REGEX.lastIndex = 0;
    var matches = null;
    while(matches = SUBMODULE_STATUS_REGEX.exec(commandResults)) {
      submoduleStatuses.push(new SubmoduleStatus(
        matches[SUBMODULE_MATCHES.prefix],
        matches[SUBMODULE_MATCHES.sha1],
        matches[SUBMODULE_MATCHES.path],
        matches[SUBMODULE_MATCHES.describe]
      ));
    }

    return submoduleStatuses;
  },

  branchesContainingCommit: function(commitRef) {
    var commandResults = utils.execSync('git branch --column=dense --contains ' + commitRef);
    if (!commandResults || !commandResults.trim()) { return []; }

    // ignore detached heads
    commandResults = commandResults.replace(/\((HEAD )?detached (from|at) .*?\)/, '');
    var branchNames = commandResults.split(/\s+/);
    return branchNames.filter(function(branchName) {
      return branchName && branchName !== '*';
    });
  }
};
