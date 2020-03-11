'use strict';

let fse = require('fs-extra');
let path = require('path');
let fileUtils = require('../fileUtils');
let gitRepo = require('../gitRepo');
let utils = require('../utils');
let AffianceError = require('../error');
let Printer = require('../Printer');
let configLoader = require('../config/loader');
let HookContext = require('../hook-context');
let HookRunner = require('../HookRunner');

let TEMPLATE_DIR = path.resolve(__dirname, '../../template-dir');
let MASTER_HOOK = path.join(TEMPLATE_DIR, 'hooks', 'affiance-hook');
let MASTER_HOOK_JS = path.join(TEMPLATE_DIR, 'hooks', 'affiance-hook.js');

let DEFAULT_OPTIONS = {
  action: 'install',
  force: false,
  hookToSign: null,
  target: gitRepo.repoRoot(),
  update: false
};

function Installer(logger, options) {
  this.logger = logger;
  this.options = utils.mergeOptions(options, DEFAULT_OPTIONS);
}

Installer.prototype.run = function() {
  this.validateTarget();

  try {
    switch(this.options.action) {
      case 'install':
        return this.install();
      case 'uninstall':
        return this.uninstall();
      case 'update':
        return this.update();
      case 'sign':
        return this.sign();
      case 'run':
        return this.runPreCommit();
      default:
        return this.logger.error('Unknown Installer action:', this.options.action);
    }
  } catch(e) {
    switch(e.affianceName) {
      case AffianceError.PreExistingHooks:
        this.logger.error(e.message);
        process.exit(73); // EX_CANTCREAT

      case AffianceError.InvalidGitRepo:
        this.logger.error(e.message);
        process.exit(69); // EX_UNAVAILABLE

      default:
        this.logger.error(e.message);
        if (e.stack) { this.logger.debug(e.stack); }
        process.exit(70); // EX_SOFTWARE
    }
  }
};

Installer.prototype.install = function() {
  this.logger.log('Installing hooks into', this.options.target);

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

Installer.prototype.sign = function() {
  if (this.options.hookToSign) {
    this.signHook();
  } else {
    this.signConfig();
  }

  return true;
};

Installer.prototype.runPreCommit = function() {
  let config  = configLoader.loadRepoConfig();
  let hookContext = HookContext.createContext('run-all', config, [], process.stdin);
  config.applyEnvironment(hookContext, process.env);

  let printer = new Printer(config, this.logger, hookContext);
  let hookRunner = new HookRunner(config, this.logger, hookContext, printer);

  return hookRunner.run();
};

Installer.prototype.signHook = function() {
  this.logger.log('Updating signature for hook', this.options.hookToSign);
  let config = require('../config/loader').loadRepoConfig();

  let HookContext = require('../hook-context');
  let context = HookContext.createContext(this.options.hookToSign, config, process.argv.slice(1), process.stdin);

  let PluginHookLoader = require('../hook-loader/PluginHookLoader');
  new PluginHookLoader(config, context, this.logger).updateSignatures();
};

Installer.prototype.signConfig = function() {
  this.logger.log('Updating signature for config file');
  let config = require('../config/loader').loadRepoConfig({verify: false});
  config.updateSignature();
};

Installer.prototype.compareFiles = function(fileNameA, fileNameB) {
  let statA = fse.statSync(fileNameA);
  let statB = fse.statSync(fileNameB);

  // First check size;
  if(statA.size !== statB.size) { return false; }

  let contentA = fse.readFileSync(fileNameA, 'utf8');
  let contentB = fse.readFileSync(fileNameB, 'utf8');
  return (contentA === contentB);
};

Installer.prototype.validateTarget = function() {
  let absoluteTarget = fileUtils.absolutePath(this.options.target);
  if (!fse.existsSync(absoluteTarget)) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target does not exist');
  }
  let stats = fse.statSync(absoluteTarget);
  if (!stats.isDirectory()) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target not a directory');
  }

  let gitResult = utils.execSync('git rev-parse --git-dir', { cwd: absoluteTarget });
  if (gitResult === false) {
    throw new AffianceError.error(AffianceError.InvalidGitRepo, 'target does not appear to be a git repo');
  }
};

Installer.prototype.ensureDirectory = function(dirPath) {
  fse.ensureDirSync(dirPath);
};

Installer.prototype.preserveOldHooks = function() {
  this.ensureDirectory(this.oldHooksPath());

  for (let i in utils.supportedHookTypes) {
    let hookType = utils.supportedHookTypes[i];
    let hookFileName = path.join(this.hooksPath(), hookType);
    let oldHookFileName = path.join(this.oldHooksPath(), hookType);
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

  for (let i in utils.supportedHookTypes) {
    let hookType = utils.supportedHookTypes[i];
    let hookFileName = path.join(this.hooksPath(), hookType);
    let oldHookFileName = path.join(this.oldHooksPath(), hookType);
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
  for (let i in utils.supportedHookTypes) {
    let hookType = utils.supportedHookTypes[i];
    let hookFileName = path.join(this.hooksPath(), hookType);
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

  for (let i in utils.supportedHookTypes) {
    let hookType = utils.supportedHookTypes[i];
    let hookFileName = path.join(this.hooksPath(), hookType);
    if (this.isAffianceHook(hookFileName)) {
      fse.removeSync(hookFileName);
    }
  }
};

Installer.prototype.installStarterConfig = function() {
  let repoConfigFile = path.join(this.options.target, configLoader.CONFIG_FILE_NAME);
  if (fse.existsSync(repoConfigFile)) { return; }

  let starterConfigPath = path.resolve(__dirname, '../../config/starter.yml');
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
    let absoluteTarget = fileUtils.absolutePath(this.options.target);
    let gitDir = gitRepo.gitDir(absoluteTarget);
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

  let fileContents = fse.readFileSync(fileName, 'utf8');
  return !!fileContents.match(/Affiance/g);
};

module.exports = Installer;
