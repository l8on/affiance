'use strict';
const _ = require('lodash');
const fse = require('fs-extra');
const path = require('path');
const ini = require('ini');
const semver = require('semver');
const fileUtils = require('./fileUtils');
const utils = require('./utils');
const repoRoot = require('./repoRoot');
const AffianceError = require('./error');

class SubmoduleStatus {
  constructor(prefix, sha1, path, describe) {
    this.prefix = prefix;
    this.sha1 = sha1;
    this.path = path;
    this.describe = describe;
  }

  isUninitialized() {
    return this.prefix === '-';
  }

  isOutdated() {
    return this.prefix === '+';
  }

  hasMergeConflict() {
    return this.prefix === 'U';
  }
}

const SUBMODULE_STATUS_REGEX = /^\s*([-+U]?)(\w+)\s([^\s]+?)(?:\s\((.+)\))?$/gm;
const SUBMODULE_MATCHES = {
  prefix: 1,
  sha1: 2,
  path: 3,
  describe: 4
};

module.exports = {
  gitVersion: function() {
    if (!this._gitVersion) {
      let commandResults;
      if (commandResults = utils.execSync('git --version')) {
        let matches = /\d+(\.\d+)+/.exec(commandResults);
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
    let result = utils.spawnSync('git', ['config', '--get', 'core.commentchar']);
    let commentChar = (result.status !== 0) ? '' : result.stdout.toString().trim();
    if (commentChar) { return commentChar; }

    return '#';
  },

  mergeState: function() {
    let mergeState = {
      mergeHead: null,
      mergeMsg: null
    };

    let result = utils.spawnSync('git', ['rev-parse', 'MERGE_HEAD']);
    let currMergeHead = result.stdout.toString().trim();
    if (currMergeHead !== 'MERGE_HEAD') {
      mergeState.mergeHead = currMergeHead;
    }

    let mergeMsgPath = this.gitDir(this.repoRoot()) + '/MERGE_MSG';
    if (fileUtils.isFile(mergeMsgPath)) {
      mergeState.mergeMsg = fse.readFileSync(mergeMsgPath, 'utf8');
    }
    return mergeState;
  },

  cherryPickState: function() {
    let cherryPickState = {
      cherryPickHead: null
    };

    let result = utils.spawnSync('git', ['rev-parse', 'CHERRY_PICK_HEAD']);
    let currCherryPickHead = result.stdout.toString().trim();
    if (currCherryPickHead !== 'CHERRY_PICK_HEAD') {
      cherryPickState.cherryPickHead = currCherryPickHead;
    }

    return cherryPickState;
  },

  allFiles: function() {
    let gitLsResults = utils.execSync('git ls-files');
    let gitLsResultLines = gitLsResults.split('\n');
    let allFiles = [];

    for (let i in gitLsResultLines) {
      let line = gitLsResultLines[i];
      let currAbsPath = path.resolve(this.repoRoot(), line);
      // Do not return  directories.
      if (fileUtils.isDirectory(currAbsPath)) { continue; }

      allFiles.push(currAbsPath);
    }

    return allFiles;
  },

  modifiedFiles: function(options) {
    options = options || {};

    let flags = '';
    if (options.staged) { flags = '--cached'; }

    let refs = options.refs || '';
    let subCommand = options.subCommand || 'diff';
    let command = 'git ' + subCommand + ' --name-only -z --diff-filter=ACMR --ignore-submodules=all ' + flags + ' ' + refs;
    let commandResults = utils.execSync(command);

    let rawModifiedFiles = commandResults.split('\0');
    let modifiedFiles = [];
    for (let i in rawModifiedFiles) {
      let rawModifiedFile = rawModifiedFiles[i].trim();
      if(!rawModifiedFile) { continue; }

      modifiedFiles.push(path.resolve(rawModifiedFile));
    }

    return modifiedFiles;
  },

  listFiles: function(paths, options) {
    paths = paths || [];
    options = options || {};

    let ref = options.ref || 'HEAD';
    let commandResults = utils.execSync(
      'git ls-tree --name-only ' +
      ref + ' ' +
      '"' + paths.join('" "') + '"'
    );
    if (!commandResults) { return []; }

    let relativePaths = commandResults.split('\n');
    let outputPaths = [];
    relativePaths.forEach((relativePath) => {
      let absPath = path.resolve(this.repoRoot(), relativePath);
      if (fileUtils.isDirectory(absPath)) { return; }

      outputPaths.push(absPath);
    });

    return outputPaths;
  },

  isTracked: function(path) {
    return utils.execSync('git ls-files ' + path + ' --error-unmatch 2>&1 > /dev/null') !== false;
  },

  extractModifiedLines: function(filePath, options) {
    options = options || {};
    let lineMap = {};
    let flags = options.staged ? '--cached' : '';
    let refs = options.refs || '';
    let subCommand = options.subCommand || 'diff';
    let command = 'git ' + subCommand + ' --no-color --no-ext-diff -U0 ' + flags + ' ' + refs + ' -- "' + filePath + '"';
    let commandResults = utils.execSync(command);

    this.DIFF_HUNK_REGEX.lastIndex = 0;
    let matches = null;

    while(matches = this.DIFF_HUNK_REGEX.exec(commandResults)) {
      let startLine = matches[1];
      let linesAdded = parseInt(matches[2] || 1);

      let currentLine = startLine;
      for(let i = 0; i < linesAdded; i++) {
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

      let gitDir = path.join(repoDir, '.git');
      if(!fse.existsSync(gitDir)) {
        throw AffianceError.error(AffianceError.InvalidGitRepo, 'no .git directory found');
      }
      // .git could reference a text file that has the actual git file location.
      let stats = fse.statSync(gitDir);
      if(!stats.isDirectory()) {
        let gitFileContents = fse.readFileSync(gitDir, 'utf8');
        let gitDirRegex = /^gitdir: (.*)$/g;
        let dirMatches = gitDirRegex.exec(gitFileContents);
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
    let commandResults = utils.execSync('git ls-files .gitmodules');
    if (!commandResults) { return []; }

    let previousSubmodules = this.submodules({ref: 'HEAD'});
    let currSubmodules = this.submodules();

    return _.differenceBy(previousSubmodules, currSubmodules, 'path');
  },

  submodules: function(options) {
    options = options || {};
    let ref = options.ref || '';

    let submodules = [];
    let commandResults = utils.execSync('git show ' + ref + ':.gitmodules');
    if (!commandResults) { return []; }

    let parsedIni = ini.parse(commandResults);
    for (let i in parsedIni) {
      let section = parsedIni[i];

      // git < 1.8.5 does not update the .gitmodules file with submodule
      // changes, so when we are looking at the current state of the work tree,
      // we need to check if the submodule actually exists via another method,
      // since the .gitmodules file we parsed does not represent reality.
      if (!ref && semver.lt(this.gitVersion(), '1.8.5')) {
        let subCommandResults = utils.execSync('git submodule status "' + section.path +'"');
        if (!subCommandResults) { continue; }
      }

      submodules.push({path: section.path, url: section.url});
    }

    return submodules;
  },

  submoduleStatuses: function(options) {
    options = options || {};
    let flags = '';
    if (options.recursive) {
      flags = ' --recursive';
    }

    let command = 'git submodule status' + flags;
    let commandResults = utils.execSync(command).trim();
    if (!commandResults) { return []; }

    let submoduleStatuses = [];
    SUBMODULE_STATUS_REGEX.lastIndex = 0;
    let matches = null;
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
    let commandResults = utils.execSync('git branch --column=dense --contains ' + commitRef);
    if (!commandResults || !commandResults.trim()) { return []; }

    // ignore detached heads
    commandResults = commandResults.replace(/\((HEAD )?detached (from|at) .*?\)/, '');
    let branchNames = commandResults.split(/\s+/);
    return branchNames.filter((branchName) => {
      return branchName && branchName !== '*';
    });
  }
};
