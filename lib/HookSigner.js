const _ = require('lodash');
const AffianceError = require('./error');
const fse = require('fs-extra');
const fileUtils = require('./fileUtils');
const utils = require('./utils');
const gitRepo = require('./gitRepo');
const crypto = require('crypto');
const path = require('path');

const IGNORED_CONFIG_KEYS = ['skip'];

module.exports = class HookSigner {
  constructor(hookName, config, context) {
    this.hookName = hookName;
    this.config = config;
    this.context = context;
  }

  hookPath() {
    if (!this._hookPath) {
      let pluginPath = path.join(
        this.config.pluginDirectory(),
        this.context.hookScriptName,
        utils.camelCase(this.hookName)
      );

      //
      try {
        require(pluginPath);
        return pluginPath;
      } catch(e) {
        if(e.code !== 'MODULE_NOT_FOUND') { throw(e); }

        let hookConfig = this.config.forHook(this.hookName, this.context.hookConfigName);
        let commandList = (hookConfig['command'] || hookConfig['requiredExecutable']).split(/\s+/);

        if (hookConfig['verifySignatures'] && !this.isSignableFile(commandList[0])) {
          throw AffianceError.error(
            AffianceError.InvalidHookDefinition,
            'Hook must specify a `required_executable` or `command` that ' +
            'is tracked by git (i.e. is a path relative to the root ' +
            'of the repository) so that it can be signed'
          );
        }

        this._hookPath = path.resolve(gitRepo.repoRoot(), commandList[0]);
      }
    }

    return this._hookPath;
  }

  updateSignature() {
    let commandResponse = utils.spawnSync(
      'git',
      ['config', '--local', this.signatureConfigKey(), this.signature()]
    );

    if (commandResponse.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to write to local repo git config: ' + commandResponse.stderr.toString()
      );
    }

    return true;
  }

  isSignableFile(filePath) {
    return (filePath.indexOf('.' + path.sep) === 0 && gitRepo.isTracked(filePath));
  }

  hasSignatureChanged() {
    return (this.signature() !== this.storedSignature());
  }

  signature() {
    let hookConfig = _.merge({}, this.config.forHook(this.hookName, this.context.hookConfigName));
    IGNORED_CONFIG_KEYS.forEach(function(configKey) {
      delete hookConfig[configKey];
    });

    let hash = crypto.createHash('sha256');
    hash.update(this.hookContents() + JSON.stringify(hookConfig));
    return hash.digest('hex');
  }

  hookContents() {
    if (!fileUtils.isFile(this.hookPath())) { return ''; }
    return fse.readFileSync(this.hookPath(), 'utf8');
  }

  storedSignature() {
    let commandResponse = utils.spawnSync('git', ['config', '--local', '--get',  this.signatureConfigKey()]);
    if (commandResponse.status === 1) {
      return '';
    } else if (commandResponse.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to read from local repo git config: ' + commandResponse.stderr.toString()
      );
    }

    return commandResponse.stdout.toString().trim();
  }

  signatureConfigKey() {
    return ['affiance', this.context.hookConfigName, this.hookName, 'signature'].join('.');
  }
};
