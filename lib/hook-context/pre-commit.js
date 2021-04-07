'use strict';
const fse = require('fs-extra');
const AffianceError = require('../error');
const gitRepo = require('../gitRepo');
const HookContextBase = require('./base');
const utils = require('../utils');
const fileUtils = require('../fileUtils');

module.exports = class HookContextPreCommit extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'pre-commit';
    this.hookConfigName = 'PreCommit';
    this._isAmendment = null;
  }

  isAmendment() {
    if (this._isAmendment === null) {
      let gitCommand = utils.grandParentCommand();
      // It's easy if 'git commit --amend' was used
      let easyAmendRegex = /\scommit(\s.*)?\s--amend(\s|$)/;
      this._isAmendment = !!gitCommand.match(easyAmendRegex);
      if(this._isAmendment) { return this._isAmendment; }

      // Check for git aliases that call `commit --amend`
      let commandOutput = utils.execSync('git config --get-regexp "^alias\\." "commit(\\s.*)?\\s--amend(\\s|$)"');
      if (!commandOutput) { return this._isAmendment; }

      let aliasRegex = /^alias\.([-\w]+)/gm;
      let matches = null;
      while ((matches = aliasRegex.exec(commandOutput)) !== null) {
        let matchRegex = new RegExp('git(\\.exe)?\\s+' + matches[1]);
        this._isAmendment = !!gitCommand.match(matchRegex);
        if(this._isAmendment) { return this._isAmendment; }
      }
    }

    return this._isAmendment;
  }

  anyChanges() {
    let commandResults = utils.execSync('git status -z --untracked-files=no').trim();

    let modifiedFiles = commandResults.split('\0').map((line) => {
      return line.replace(/[^\s]+\s+(.+)/, '$1');
    });

    return (modifiedFiles.length > 0);
  }

  setupEnvironment() {
    this.storeModifiedTimes();
    this.storeMergeState();
    this.storeCherryPickState();

    if (!gitRepo.isInitialCommit() && this.anyChanges()) {
      this._stashAttempted = true;
      let stashMessage = `Affiance: Stash of repo state before hook run at ${Date.now()}`;
      let command = `git -c commit.gpgsign=false stash save --keep-index --quiet "${stashMessage}"`;
      let commandResults = utils.execSync(command).trim();


      if (commandResults === false) {
        throw AffianceError.error(
          AffianceError.HookSetupFailed,
          'Unable to setup environment for commit-msg hook run.'
        );
      }

      let stashListResults = utils.execSync('git stash list -1').trim();
      this._changesStashed = !!stashListResults.match(new RegExp(stashMessage, 'g'));
    }

    this.restoreModifiedTimes();
  }

  // Restore unstaged changes and reset file modification times so it appears
  // as if nothing ever changed.
  //
  // We want to restore the modification times for each of the files after
  // every step to ensure as little time as possible has passed while the
  // modification time on the file was newer. This helps us play more nicely
  // with file watchers.
  cleanupEnvironment() {
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
  }

  clearWorkingTree() {
    let removedSubmodules = gitRepo.stagedSubmoduleRemovals();

    let commandResult = utils.execSync('git reset --hard');
    if (commandResult === false) {
      throw AffianceError.error(
        AffianceError.HookCleanupFailed,
        'Unable to cleanup working tree for commit-msg hook run'
      );
    }

    for(let i in removedSubmodules) {
      fse.removeSync(removedSubmodules[i].path);
    }
  }

  restoreWorkingTree() {
    let commandResult = utils.execSync('git stash pop --index --quiet');

    if (commandResult === false) {
      throw AffianceError.error(
        AffianceError.HookCleanupFailed,
        'Unable to cleanup working tree for commit-msg hook run'
      );
    }
  }

  modifiedFiles() {
    if (!this._modifiedFiles) {
      let currentStaged = gitRepo.modifiedFiles({staged: true});
      this._modifiedFiles = currentStaged;

      if (this.isAmendment()) {
        let subCommand = 'show --format=%n';
        let previouslyModified = gitRepo.modifiedFiles({subCommand: subCommand});
        this._modifiedFiles = this._modifiedFiles.concat(this.filterModifiedFiles(previouslyModified));
      }
    }

    return this._modifiedFiles;
  }

  modifiedLinesInFile(filePath) {
    this._modifiedLinesByFile = this._modifiedLinesByFile || {};
    if (!this._modifiedLinesByFile[filePath]) {
      this._modifiedLinesByFile[filePath] = gitRepo.extractModifiedLines(filePath, {staged: true});

      if (this.isAmendment()) {
        let subCommand = 'show --format=%n';
        this._modifiedLinesByFile[filePath] = this._modifiedLinesByFile[filePath].concat(
          gitRepo.extractModifiedLines(filePath, {subCommand: subCommand})
        );
        this._modifiedLinesByFile[filePath].sort();
      }
    }

    return this._modifiedLinesByFile[filePath];
  }

  storeModifiedTimes() {
    this._modifiedTimes = {};
    let stagedFiles = this.modifiedFiles();
    let unstagedFiles = gitRepo.modifiedFiles({staged: false});

    stagedFiles.concat(unstagedFiles).forEach((filePath) => {
      if (fileUtils.isBrokenSymlink(filePath)) { return; }
      if (!fse.existsSync(filePath)) { return; }

      this._modifiedTimes[filePath] = fileUtils.modifiedTime(filePath);
    });
  }

  restoreModifiedTimes() {
    for(let modifiedFilePath in this._modifiedTimes) {
      if (fileUtils.isBrokenSymlink(modifiedFilePath)) { continue; }
      if (!fse.existsSync(modifiedFilePath)) { continue; }

      // `utimesSync` expects timestamps at the second resolution,
      // but we store the timestamp in ms.
      // Divide our stored value by 1000 to satisfy the api.
      let mtime = this._modifiedTimes[modifiedFilePath] / 1000;
      fse.utimesSync(modifiedFilePath, mtime, mtime);
    }
  }

  storeMergeState() {
    if (!this._mergeState) {
      this._mergeState = gitRepo.mergeState();
    }

    return this._mergeState;
  }

  restoreMergeState() {
    if (!this._mergeState) { return; }

    let gitDir = gitRepo.gitDir(gitRepo.repoRoot());

    if (this._mergeState.mergeHead) {
      let mergeModeFilePath = gitDir + '/MERGE_MODE';
      fse.ensureFileSync(mergeModeFilePath);

      let mergeHeadFilePath = gitDir + '/MERGE_HEAD';
      fse.writeFileSync(mergeHeadFilePath, this._mergeState.mergeHead);

      this._mergeState.mergeHead = null;
    }

    if (this._mergeState.mergeMsg) {
      let mergeMsgFilePath = gitDir + '/MERGE_MSG';
      fse.writeFileSync(mergeMsgFilePath, `${this._mergeState.mergeMsg}\n`);
      this._mergeState.mergeMsg = null;
    }

    this._mergeState = null;
  }

  storeCherryPickState() {
    if (!this._cherryPickState) {
      this._cherryPickState = gitRepo.cherryPickState();
    }

    return this._cherryPickState;
  }

  restoreCherryPickState() {
    if (!this._cherryPickState) { return; }

    let gitDir = gitRepo.gitDir(gitRepo.repoRoot());

    if (this._cherryPickState.cherryPickHead) {
      let cherryPickHeadFilePath = gitDir + '/CHERRY_PICK_HEAD';
      fse.writeFileSync(cherryPickHeadFilePath, this._cherryPickState.cherryPickHead);

      this._cherryPickState.cherryPickHead = null;
    }

    this._cherryPickState = null;
  }
};
