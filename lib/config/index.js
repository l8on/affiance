'use strict';
const _ = require('lodash');
const crypto = require('crypto');
const path = require('path');
const fse = require('fs-extra');
const AffianceError = require('../error');
const gitRepo = require('../gitRepo');
const configValidator = require('./validator');
const utils = require('../utils');

/**
 * @class Config
 * @classdesc Encapsulate functionality related to configuration like lookups,
 *   signature verification, and parsing of dynamic fields like `concurrency`.
 */
module.exports = class Config {
  /**
   * Creates a Config instance from a json object and options.
   *
   * @param {object} json - the
   * @param options
   */
  constructor(json, options) {
    this.options = _.merge({}, options || {});
    this.json = _.merge({}, json);
    if (this.options.validate !== false) {
      this.json = configValidator.validate(this, this.json, this.options);
    }
  }

  get(key) {
    return this.json[key];
  }

  hasSignatureChanged() {
    return (this.signature() !== this.storedSignature());
  }

  signature() {
    let hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(this.json));

    return hash.digest('hex');
  }

  shouldVerifySignatures() {
    if (process.env.AFFIANCE_NO_VERIFY) { return false; }
    if (this.json['verifySignatures'] !== false) { return true; }

    let result = utils.spawnSync('git', ['config', '--local', '--get', this.verifySignatureConfigKey()]);

    // Key does not exist
    if (result.status === 1) {
      return true;

    } else if(result.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to read from local repo git config: ' + result.stderr.toString()
      );
    }

    return (result.stdout.toString().trim() !== '0');
  }

  updateSignature() {
    let result = utils.spawnSync('git', ['config', '--local', this.signatureConfigKey(), this.signature()]);
    if(result.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to read from local repo git config: ' + result.stderr.toString()
      );
    }

    let verifySignatureValue = this.json['verifySignatures'] ? 1 : 0;
    let verifyResult = utils.spawnSync('git', ['config', '--local', this.verifySignatureConfigKey(), verifySignatureValue]);
    if(verifyResult.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to read from local repo git config: ' + verifyResult.stderr.toString()
      );
    }
  }

  storedSignature() {
    let result = utils.spawnSync('git', ['config', '--local', '--get', this.signatureConfigKey()]);

    // Key does not exist
    if (result.status === 1) {
      return '';

    } else if(result.status !== 0) {
      throw AffianceError.error(
        AffianceError.GitConfigError,
        'Unable to read from local repo git config: ' + result.stderr.toString()
      );
    }

    return result.stdout.toString().trim();
  }

  signatureConfigKey() {
    return 'affiance.configuration.signature';
  }

  verifySignatureConfigKey() {
    return 'affiance.configuration.verifysignatures';
  }

  applyEnvironment(hookContext, env) {
    let skippedHooks = gatherSkippedHooks(env);
    let onlyHooks = gatherOnlyHooks(env);
    let hookType = hookContext.hookConfigName;

    if (onlyHooks.length || skippedHooks.indexOf('all') > -1 || skippedHooks.indexOf('ALL') > -1) {
      this.json[hookType]['ALL']['skip'] = true;
    }

    for (let onlyHookIndex in onlyHooks) {
      let onlyHook = onlyHooks[onlyHookIndex];
      onlyHook = utils.camelCase(onlyHook);

      if(!this.hookExists(hookContext, onlyHook)) { continue; }

      this.json[hookType][onlyHook] = this.json[hookType][onlyHook] || {};
      this.json[hookType][onlyHook]['skip'] = false;
    }

    for (let skipHookIndex in skippedHooks) {
      let skipHook = skippedHooks[skipHookIndex];
      skipHook = utils.camelCase(skipHook);

      if(!this.hookExists(hookContext, skipHook)) { continue; }

      this.json[hookType][skipHook] = this.json[hookType][skipHook] || {};
      this.json[hookType][skipHook]['skip'] = true;

    }
  }

  enabledBuiltInHooks(hookContext) {
    return Object.keys(this.json[hookContext.hookConfigName])
      .filter((hookName) => { return (hookName !== 'ALL'); })
      .filter((hookName) => { return this.isBuiltInHook(hookContext, hookName); })
      .filter((hookName) => { return this.isHookEnabled(hookContext, hookName); });
  }

  enabledAdHocHooks(hookContext) {
    return Object.keys(this.json[hookContext.hookConfigName])
      .filter((hookName) => { return (hookName !== 'ALL'); })
      .filter((hookName) => { return this.isAdHocHook(hookContext, hookName); })
      .filter((hookName) => { return this.isHookEnabled(hookContext, hookName); });
  }

  forHook(hookName, hookType) {
    let hookConfig = this.constructor.smartMerge(this.json[hookType]['ALL'], this.json[hookType][hookName] || {});
    hookConfig.enabled = this.isHookEnabled(hookType, hookName);

    return hookConfig;
  }

  isHookEnabled(hookContextOrType, hookName) {
    let hookType = typeof hookContextOrType === 'string' ? hookContextOrType : hookContextOrType.hookConfigName;

    let specificHookConfig = this.json[hookType][hookName] || {};
    if (typeof specificHookConfig.enabled !== 'undefined') {
      return !!specificHookConfig.enabled;
    }

    let allHookConfig = this.json[hookType]['ALL'] || {};
    if (typeof allHookConfig.enabled !== 'undefined') {
      return !!allHookConfig.enabled;
    }

    return false;
  }

  hookExists(hookContext, hookName) {
    return (
      this.isBuiltInHook(hookContext, hookName) ||
      this.isPluginHook(hookContext, hookName) ||
      this.isAdHocHook(hookContext, hookName)
    );
  }

  isBuiltInHook(hookContext, hookName) {
    hookName = utils.camelCase(hookName);
    let hookPath = path.join(__dirname, '..', 'hook', hookContext.hookScriptName, hookName + '.js');
    return fse.existsSync(hookPath);
  }

  isPluginHook(hookContextOrType, hookName) {
    let hookType = typeof hookContextOrType === 'string' ? hookContextOrType : hookContextOrType.hookScriptName;
    let hookPath = path.join(this.pluginDirectory(), hookType, hookName + '.js');
    return fse.existsSync(hookPath);
  }

  pluginDirectory() {
    let pluginDirectory = this.json['pluginDirectory'] || '.git-hooks';
    return path.join(gitRepo.repoRoot(), pluginDirectory);
  }

  isAdHocHook(hookContext, hookName) {
    let hookConf = this.json[hookContext.hookConfigName] || {};
    hookConf = hookConf[hookName];

    if (!hookConf) { return false; }

    return (
      !this.isBuiltInHook(hookContext, hookName) &&
      !this.isPluginHook(hookContext, hookName) &&
      (hookConf.command || hookConf.requiredExecutable)
    );
  }

  concurrency() {
    if (!this._concurrency) {
      let cores = utils.processorCount();
      let content = this.json.concurrency || '%{processors}';

      if (typeof content === 'string') {
        let concurrencyExpr = content.replace('%{processors}', cores);
        let matches = /(\d+)\s*([+\-*\/])\s*(\d+)/.exec(concurrencyExpr);
        if (matches) {
          let sideA = matches[1];
          let op = matches[2];
          let sideB = matches[3];
          this._concurrency = Math.max(operatorFunction[op](parseInt(sideA), parseInt(sideB)), 1);
        } else {
          this._concurrency = Math.max(parseInt(concurrencyExpr), 1);
        }
      } else if (typeof content === 'number') {
        this._concurrency = parseInt(content, 10);
      } else {
        this._concurrency = 1;
      }
    }

    return this._concurrency;
  }

  /**
   * Merge two sets of configurations with special handling of
   * the `ALL` configuration. This will override all defaults for
   * the merged object.
   * @param parent
   * @param child
   * @returns {*}
   */
  static smartMerge(parent, child) {
    let childAll = child.ALL;

    // Tread the ALL hook specially so that it overrides any configuration
    // specified by the default configuration.
    if (childAll) {
      let newParent = {};
      for (let key in parent) {
        let value = parent[key];
        let mergeResult = this.smartMerge(value, childAll);
        newParent[key] = mergeResult;
      }
      parent = newParent;
    }

    for (let key in child) {
      let oldValue = parent[key];
      let newValue = child[key];

      if (oldValue && !Array.isArray(oldValue) && typeof oldValue === 'object') {
        parent[key] = this.smartMerge(oldValue, newValue);
      } else {
        parent[key] = newValue;
      }
    }

    return parent;
  }
};

const operatorFunction = {
  '+':  (a, b) => { return a + b; },
  '-':  (a, b) => { return a - b; },
  '*':  (a, b) => { return a * b; },
  '/':  (a, b) => { return a / b; },
  '\\': (a, b) => { return a / b; }
};

function gatherSkippedHooks(env) {
  let skippedHookStr = '';
  skippedHookStr += env.SKIP || '';
  skippedHookStr += env.SKIP_CHECKS || '';
  skippedHookStr += env.SKIP_HOOKS || '';

  if (!skippedHookStr) { return [] }
  return skippedHookStr.split(/[:, ]/);
}

function gatherOnlyHooks(env) {
  if (!env.ONLY) { return []; }

  return env.ONLY.split(/[:, ]/);
}
