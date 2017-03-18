var fse = require('fs-extra');
var AffianceError = require('../error');
var gitRepo = require('../gitRepo');
var HookContextBase = require('./base');
var utils = require('../utils');
var fileUtils = require('../fileUtils');

function HookContextPreCommit(config, argv, input) {
  HookContextBase.prototype.constructor.apply(this, arguments);

  this.hookScriptName = 'pre-commit';
  this.hookConfigName = 'PreCommit';
  this._isAmendment = null;
}

Object.assign(HookContextPreCommit.prototype, HookContextBase.prototype);

HookContextPreCommit.prototype.isAmendment = function() {
  if (this._isAmendment === null) {
    var parentCommand = utils.parentCommand();
    // It's easy if 'git commit --amend' was used
    var easyAmendRegex = /\scommit(\s.*)?\s--amend(\s|$)/;
    this._isAmendment = !!parentCommand.match(easyAmendRegex);
    if(this._isAmendment) { return this._isAmendment; }

    // Check for git aliases that call `commit --amend`
    var commandOutput = utils.execSync('git config --get-regexp "^alias\\." "commit(\\s.*)?\\s--amend(\\s|$)"');

    var aliasRegex = /^alias\.([-\w]+)/gm;
    var matches = null;
    while ((matches = aliasRegex.exec(commandOutput)) !== null) {
      var matchRegex = new RegExp('git(\\.exe)?\\s+' + matches[1]);
      this._isAmendment = !!parentCommand.match(matchRegex);
      if(this._isAmendment) { return this._isAmendment; }
    }
  }

  return this._isAmendment;
};

HookContextPreCommit.prototype.anyChanges = function() {
  var commandResults = utils.execSync('git status -z --untracked-files=no').trim();

  var modifiedFiles = commandResults.split("\0").map(function(line) {
    return line.replace(/[^\s]+\s+(.+)/, '$1');
  });

  return (modifiedFiles.length > 0);
};

HookContextPreCommit.prototype.setupEnvironment = function() {
  this.storeModifiedTimes();
  this.storeMergeState();
  this.storeCherryPickState();

  if (!gitRepo.isInitialCommit() && this.anyChanges()) {
    this._stashAttempted = true;
    var stashMessage = "Affiance: Stash of repo state before hook run at " + Date.now();
    var command = 'git -c commit.gpgsign=false stash save --keep-index --quiet "' + stashMessage + '"';
    var commandResults = utils.execSync(command).trim();
    if (commandResults === false) {
      throw AffianceError.error(
        AffianceError.HookSetupFailed,
        "Unable to setup environment for commit-msg hook run:"
      );
    }

    var stashListResults = utils.execSync('git stash list -1').trim();
    this._changesStashed = !!stashListResults.match(new RegExp(stashMessage, 'g'));
  }

  this.restoreModifiedTimes();
};

// Restore unstaged changes and reset file modification times so it appears
// as if nothing ever changed.
//
// We want to restore the modification times for each of the files after
// every step to ensure as little time as possible has passed while the
// modification time on the file was newer. This helps us play more nicely
// with file watchers.
HookContextPreCommit.prototype.cleanupEnvironment = function() {
  if (!(gitRepo.isInitialCommit() || (this._stashAttempted && !this._changesStashed)) ) {
    this.clearWorkingTree();
    this.restoreModifiedTimes();
  }

  if (this._changesStashed) {
    this.restoreWorkingTree();
    this.restoreModifiedTimes();
  }

  this.restoreMergeState();
  this.restoreCherryPickState();
  this.restoreModifiedTimes();
};

HookContextPreCommit.prototype.clearWorkingTree = function() {
  var removedSubmodules = gitRepo.stagedSubmoduleRemovals();

  var commandResult = utils.execSync('git reset --hard');
  if (commandResult === false) {
    throw AffianceError.error(
      AffianceError.HookCleanupFailed,
      'Unable to cleanup working tree for commit-msg hook run'
    );
  }

  for(var i in removedSubmodules) {
    var submodulePath = removedSubmodules[i].path;
    fse.removeSync(removedSubmodules[i].path);
  }
};

HookContextPreCommit.prototype.restoreWorkingTree = function() {
  var commandResult = utils.execSync('git stash pop --index --quiet');

  if (commandResult === false) {
    throw AffianceError.error(
      AffianceError.HookCleanupFailed,
      'Unable to cleanup working tree for commit-msg hook run'
    );
  }
};

HookContextPreCommit.prototype.modifiedFiles = function() {
  if (!this._modifiedFiles) {
    var currentStaged = gitRepo.modifiedFiles({staged: true});
    this._modifiedFiles = currentStaged;

    if (this.isAmendment()) {
      var subCommand = 'show --format=%n';
      var previouslyModified = gitRepo.modifiedFiles({subCommand: subCommand});
      this._modifiedFiles = this._modifiedFiles.concat(this.filterModifiedFiles(previouslyModified));
    }
  }

  return this._modifiedFiles;
};

HookContextPreCommit.prototype.modifiedLinesInFile = function(filePath) {
  this._modifiedLinesByFile = this._modifiedLinesByFile || {};
  if (!this._modifiedLinesByFile[filePath]) {
    this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {staged: true});

    if (this.isAmendment()) {
      var subCommand = 'show --format=%n';
      this._modifiedLinesByFile[filePath] = this._modifiedLinesByFile[filePath].concat(
        gitRepo.extractModifiedLines(filePath, {subCommand: subCommand})
      );
    }
  }

  return this._modifiedLinesByFile[filePath];
};

HookContextPreCommit.prototype.storeModifiedTimes = function() {
  this._modifiedTimes = {};
  var stagedFiles = this.modifiedFiles();
  var unstagedFiles = gitRepo.modifiedFiles({staged: false});


  var self = this;
  stagedFiles.concat(unstagedFiles).forEach(function(filePath) {
    if (fileUtils.isBrokenSymlink(filePath)) { return; }
    if (!fse.existsSync(filePath)) { return; }

    self._modifiedTimes[filePath] = fileUtils.modifiedTime(filePath);
  });
};

HookContextPreCommit.prototype.restoreModifiedTimes = function() {
  for(var modifiedFilePath in this._modifiedTimes) {
    if (fileUtils.isBrokenSymlink(modifiedFilePath)) { continue; }
    if (!fse.existsSync(modifiedFilePath)) { continue; }

    // `utimesSync` expects timestamps at the second resolution,
    // but we store the timestamp in ms.
    // Divide our stored value by 1000 to satisfy the api.
    var mtime = this._modifiedTimes[modifiedFilePath] / 1000;
    fse.utimesSync(modifiedFilePath, mtime, mtime);
  }
};

HookContextPreCommit.prototype.storeMergeState = function() {
  if (!this._mergeState) {
    this._mergeState = gitRepo.mergeState();
  }

  return this._mergeState;
};

HookContextPreCommit.prototype.restoreMergeState = function() {
  if (!this._mergeState) { return; }

  var gitDir = gitRepo.gitDir(gitRepo.repoRoot());

  if (this._mergeState.mergeHead) {
    var mergeModeFilePath = gitDir + '/MERGE_MODE';
    fse.ensureFileSync(mergeModeFilePath);

    var mergeHeadFilePath = gitDir + '/MERGE_HEAD';
    fse.writeFileSync(mergeHeadFilePath, this._mergeState.mergeHead);

    this._mergeState.mergeHead = null;
  }

  if (this._mergeState.mergeMsg) {
    var mergeMsgFilePath = gitDir + '/MERGE_MSG';
    fse.writeFileSync(mergeMsgFilePath, this._mergeState.mergeMsg + "\n");

    this._mergeState.mergeMsg = null;
  }

  this._mergeState = null;
};

HookContextPreCommit.prototype.storeCherryPickState = function() {
  if (!this._cherryPickState) {
    this._cherryPickState = gitRepo.cherryPickState();
  }

  return this._cherryPickState;
};

HookContextPreCommit.prototype.restoreCherryPickState = function() {
  if (!this._cherryPickState) { return; }

  var gitDir = gitRepo.gitDir(gitRepo.repoRoot());

  if (this._cherryPickState.cherryPickHead) {
    var cherryPickHeadFilePath = gitDir + '/CHERRY_PICK_HEAD';
    fse.writeFileSync(cherryPickHeadFilePath, this._cherryPickState.cherryPickHead);

    this._cherryPickState.cherryPickHead = null;
  }

  this._cherryPickState = null;
};


module.exports = HookContextPreCommit;
