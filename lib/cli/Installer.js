var fse = require('fs-extra');
var path = require('path');
var fileUtils = require('../fileUtils');
var gitRepo = require('../gitRepo');
var utils = require('../utils');
var AffianceError = require('../error');
var childProcess = require('child_process');
var configLoader = require('../config/loader');

var TEMPLATE_DIR = path.resolve(__dirname, '../../template-dir');
var MASTER_HOOK = path.join(TEMPLATE_DIR, 'hooks', 'affiance-hook');
var MASTER_HOOK_JS = path.join(TEMPLATE_DIR, 'hooks', 'affiance-hook.js');

var DEFAULT_OPTIONS = {
  action: 'install',
  force: false,
  target: gitRepo.repoRoot(),
  update: false
};

function Installer(logger, options) {
  this.logger = logger;
  this.options = utils.mergeOptions(options, DEFAULT_OPTIONS);
}

Installer.prototype.run = function() {
  this.logger.warn('you ran the installer!');
  console.log('command options', this.options);
  this.validateTarget();

  try {
    switch(this.options.action) {
      case 'install':
        return this.install();
      case 'uninstall':
        return this.uninstall();
      case 'update':
        return this.update();
      default:
        return this.logger.error('Unknown Installer action:', this.options.action);
    }
  } catch(e) {
    switch(e.affianceName) {
      case AffianceError.PreExistingHooks:
        this.logger.error(e.message);
        process.exit(73) // EX_CANTCREAT

      case AffianceError.InvalidGitRepo:
        this.logger.error(e.message);
        process.exit(69) // EX_UNAVAILABLE

      default:
        this.logger.error(e.message);
        if (e.stack) { this.logger.debug(e.stack); }
        process.exit(70); // EX_SOFTWARE
    }
  }
};

Installer.prototype.install = function() {
  this.logger.log("Installing hooks into", this.options.target);

  this.ensureDirectory(this.hooksPath());
  this.preserveOldHooks();
  this.installMasterHook();
  this.installHookFiles();
  this.installStarterConfig();

  this.logger.success('Successfully installed hooks into', this.options.target);
  return true;
};

Installer.prototype.uninstall = function() {
  this.logger.log('Removing hooks from', this.options.target);

  this.uninstallHookFiles();
  this.uninstallMasterHook();
  this.uninstallMasterHook();
  this.restoreOldHooks();

  this.logger.success('Successfully removed hooks from', this.options.target);
  return true;
};

Installer.prototype.update = function() {
  if (this.compareFiles(MASTER_HOOK, this.masterHookInstallPath()) &&
    this.compareFiles(MASTER_HOOK_JS, this.masterHookJsInstallPath())) {
    // The installation is up to date.
    return false;
  }

  this.preserveOldHooks();
  this.installMasterHook();
  this.installHookFiles();
  this.logger.success('Hooks updated to Affiance version', utils.currentVersion());
  return true;
};

Installer.prototype.compareFiles = function(fileNameA, fileNameB) {
  var statA = fse.statSync(fileNameA);
  var statB = fse.statSync(fileNameB);

  // First check size;
  if(statA.size !== statB.size) { return false; }

  var contentA = fse.readFileSync(fileNameA);
  var contentB = fse.readFileSync(fileNameB);
  return (contentA == contentB);
};

Installer.prototype.validateTarget = function() {
  var absoluteTarget = fileUtils.absolutePath(this.options.target);
  if (!fse.existsSync(absoluteTarget)) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target does not exist');
  }
  var stats = fse.statSync(absoluteTarget);
  if (!stats.isDirectory()) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target not a directory');
  }

  try {
    var gitResult = childProcess.execSync('git rev-parse --git-dir', { cwd: absoluteTarget });
  } catch(e) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target does not appear to be a git repo');
  }
};

Installer.prototype.ensureDirectory = function(dirPath) {
  fse.ensureDirSync(dirPath);
};

Installer.prototype.preserveOldHooks = function() {
  this.ensureDirectory(this.oldHooksPath());

  for (var i in utils.supportedHookTypes) {
    var hookType = utils.supportedHookTypes[i];
    var hookFileName = path.join(this.hooksPath(), hookType);
    var oldHookFileName = path.join(this.oldHooksPath(), hookType);
    if (!this.canReplaceFile(hookFileName)) {
      this.logger.warn('Hook ' + hookFileName + ' already exists and was not installed by Affiance. Moving to ' + this.oldHooksPath());
      fse.renameSync(hookFileName, oldHookFileName);
    }
  }
  // Clean up old-hooks directory if empty
  this.rmdirIfEmpty(this.oldHooksPath());
};

Installer.prototype.restoreOldHooks = function() {
  if (!fileUtils.isDirectory(this.oldHooksPath())) { return; }

  this.logger.log('Restoring old hooks from', this.oldHooksPath());

  for (var i in utils.supportedHookTypes) {
    var hookType = utils.supportedHookTypes[i];
    var hookFileName = path.join(this.hooksPath(), hookType);
    var oldHookFileName = path.join(this.oldHooksPath(), hookType);
    if (fileUtils.isFile(oldHookFileName)) {
      fse.renameSync(oldHookFileName, hookFileName);
    }
  }
  // Clean up old-hooks directory if empty
  this.rmdirIfEmpty(this.oldHooksPath());

  this.logger.success('Successfully restored hooks from', this.oldHooksPath());
};

Installer.prototype.installMasterHook = function() {
  this.ensureDirectory(this.hooksPath());
  fse.copySync(MASTER_HOOK_JS, this.masterHookJsInstallPath());
  fse.copySync(MASTER_HOOK, this.masterHookInstallPath());
};

Installer.prototype.uninstallMasterHook = function() {
  fse.removeSync(this.masterHookInstallPath());
  fse.removeSync(this.masterHookJsInstallPath());
};

Installer.prototype.installHookFiles = function() {
  for (var i in utils.supportedHookTypes) {
    var hookType = utils.supportedHookTypes[i];
    var hookFileName = path.join(this.hooksPath(), hookType);
    if (!this.canReplaceFile(hookFileName)) {
      throw new AffianceError.error(
        AffianceError.PreExistingHooks,
        'Hook' + hookFileName + 'already exists and was not installed by Affiance'
      );
    }
    fse.removeSync(hookFileName);
    fse.copySync(this.masterHookInstallPath(), hookFileName);
  }
};

Installer.prototype.uninstallHookFiles = function() {
  if (!fileUtils.isDirectory(this.hooksPath())) { return; }

  for (var i in utils.supportedHookTypes) {
    var hookType = utils.supportedHookTypes[i];
    var hookFileName = path.join(this.hooksPath(), hookType);
    if (this.isAffianceHook(hookFileName)) {
      fse.removeSync(hookFileName);
    }
  }
};

Installer.prototype.installStarterConfig = function() {
  var repoConfigFile = path.join(this.options.target, configLoader.CONFIG_FILE_NAME);
  if (fse.existsSync(repoConfigFile)) { return; }

  var starterConfigPath = path.resolve(__dirname, '../../config/starter.yml');
  fse.copySync(starterConfigPath, repoConfigFile);
};

Installer.prototype.rmdirIfEmpty = function(dirPath) {
  try {
    fse.rmdirSync(dirPath);
  } catch(e) {
    // Rethrow error if code is not the expected 'ENOTEMPTY'
    if (e.code !== 'ENOTEMPTY') {
      throw(e);
    }
  }
};

Installer.prototype.hooksPath = function() {
  if (!this._hooksPath) {
    var absoluteTarget = fileUtils.absolutePath(this.options.target);
    var gitDir = gitRepo.gitDir(absoluteTarget);
    this._hooksPath = path.join(gitDir, 'hooks');
  }

  return this._hooksPath;
};

Installer.prototype.oldHooksPath = function() {
  if (!this._oldHooksPath) {
    this._oldHooksPath = path.join(this.hooksPath(), 'old-hooks');
  }

  return this._oldHooksPath;
};

Installer.prototype.masterHookInstallPath = function() {
  if (!this._masterHookInstallPath) {
    this._masterHookInstallPath = path.join(this.hooksPath(), 'affiance-hook');
  }
  return this._masterHookInstallPath;
};

Installer.prototype.masterHookJsInstallPath = function() {
  if (!this._masterHookJsInstallPath) {
    this._masterHookJsInstallPath = path.join(this.hooksPath(), 'affiance-hook.js');
  }
  return this._masterHookJsInstallPath;
};

Installer.prototype.canReplaceFile = function(fileName) {
  return this.options.force || !fse.existsSync(fileName) || this.isAffianceHook(fileName);
};

Installer.prototype.isAffianceHook = function(fileName) {
  if (!fse.existsSync(fileName)) { return false; }

  var fileContents = fse.readFileSync(fileName, 'utf8');
  return !!fileContents.match(/Affiance/g);
};

module.exports = Installer;
