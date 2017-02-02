var _ = require('lodash');
var crypto = require('crypto');
var path = require('path');
var fse = require('fs-extra');
var AffianceError = require('../error');
var gitRepo = require('../gitRepo');
var configValidator = require('./validator');
var utils = require('../utils');

function Config(json, options) {
  this.options = _.merge({}, options || {});
  this.json = _.merge({}, json);
  if (this.options.validate !== false) {
    this.json = configValidator.validate(this, this.json, this.options);
  }
}

//
// Static functions
//

Config.smartMerge = function(parent, child) {
  var childAll = child.ALL;

  // Tread the ALL hook specially so that it overrides any configuration
  // specified by the default configuration.
  if (childAll) {
    var newParent = {};
    for (var key in parent) {
      var value = parent[key];
      var mergeResult = this.smartMerge(value, childAll);
      newParent[key] = mergeResult;
    }
    parent = newParent;
  }

  for (var key in child) {
    var oldValue = parent[key];
    var newValue = child[key];

    if (oldValue && !Array.isArray(oldValue) && typeof oldValue === 'object') {
      parent[key] = this.smartMerge(oldValue, newValue);
    } else {
      parent[key] = newValue;
    }
  }

  return parent;
};

//
// Instance methods
//

Config.prototype.get = function(key) {
  return this.json[key];
};

Config.prototype.hasSignatureChanged = function() {
  return (this.signature() !== this.storedSignature());
};

Config.prototype.signature = function() {
  var hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(this.json));

  return hash.digest('hex');
};

Config.prototype.shouldVerifySignatures = function() {
  if (process.env.AFFIANCE_NO_VERIFY) { return false; }
  if (this.json['verifySignatures'] !== false) { return true; }

  var result = utils.spawnSync('git', ['config', '--local', '--get', this.verifySignatureConfigKey()]);

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
};

Config.prototype.updateSignature = function() {
  var result = utils.spawnSync('git', ['config', '--local', this.signatureConfigKey(), this.signature()]);
  if(result.status !== 0) {
    throw AffianceError.error(
      AffianceError.GitConfigError,
      'Unable to read from local repo git config: ' + result.stderr.toString()
    );
  }

  var verifySignatureValue = this.json['verifySignatures'] ? 1 : 0;
  var verifyResult = utils.spawnSync('git', ['config', '--local', this.verifySignatureConfigKey(), verifySignatureValue]);
  if(verifyResult.status !== 0) {
    throw AffianceError.error(
      AffianceError.GitConfigError,
      'Unable to read from local repo git config: ' + verifyResult.stderr.toString()
    );
  }
};

Config.prototype.storedSignature = function() {
  var result = utils.spawnSync('git', ['config', '--local', '--get', this.signatureConfigKey()]);

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
};

Config.prototype.signatureConfigKey = function() {
  return 'affiance.configuration.signature';
};

Config.prototype.verifySignatureConfigKey = function() {
  return 'affiance.configuration.verifysignatures';
};

Config.prototype.applyEnvironment = function(hookContext, env) {
  var skippedHooks = gatherSkippedHooks(env);
  var onlyHooks = gatherOnlyHooks(env);
  var hookType = hookContext.hookConfigName;

  if (onlyHooks.length || skippedHooks.indexOf('all') > -1 || skippedHooks.indexOf('ALL') > -1) {
    this.json[hookType]['ALL']['skip'] = true;
  }

  for (var onlyHookIndex in onlyHooks) {
    var onlyHook = onlyHooks[onlyHookIndex];
    onlyHook = utils.camelCase(onlyHook);

    if(!this.hookExists(hookContext, onlyHook)) { continue; }

    this.json[hookType][onlyHook] = this.json[hookType][onlyHook] || {};
    this.json[hookType][onlyHook]['skip'] = false;
  }

  for (var skipHookIndex in skippedHooks) {
    var skipHook = skippedHooks[skipHookIndex];
    skipHook = utils.camelCase(skipHook);

    if(!this.hookExists(hookContext, skipHook)) { continue; }

    this.json[hookType][skipHook] = this.json[hookType][skipHook] || {};
    this.json[hookType][skipHook]['skip'] = true;

  }
};

Config.prototype.enabledBuiltInHooks = function(hookContext) {
  var self = this;
  return Object.keys(this.json[hookContext.hookConfigName])
    .filter(function(hookName) { return (hookName !== 'ALL'); })
    .filter(function(hookName) { return self.isBuiltInHook(hookContext, hookName); })
    .filter(function(hookName) { return self.isHookEnabled(hookContext, hookName); });
};

Config.prototype.enabledAdHocHooks = function(hookContext) {
  var self = this;
  return Object.keys(this.json[hookContext.hookConfigName])
    .filter(function(hookName) { return (hookName !== 'ALL'); })
    .filter(function(hookName) { return self.isAdHocHook(hookContext, hookName); })
    .filter(function(hookName) { return self.isHookEnabled(hookContext, hookName); });
};

Config.prototype.forHook = function(hookName, hookType) {
  var hookConfig = this.constructor.smartMerge(this.json[hookType]['ALL'], this.json[hookType][hookName] || {});
  hookConfig.enabled = this.isHookEnabled(hookType, hookName);

  return hookConfig;
};

Config.prototype.isHookEnabled = function(hookContextOrType, hookName) {
  var hookType = typeof hookContextOrType === 'string' ? hookContextOrType : hookContextOrType.hookConfigName;

  var specificHookConfig = this.json[hookType][hookName] || {};
  if (typeof specificHookConfig.enabled !== 'undefined') {
    return !!specificHookConfig.enabled;
  }

  var allHookConfig = this.json[hookType]['ALL'] || {};
  if (typeof allHookConfig.enabled !== 'undefined') {
    return !!allHookConfig.enabled;
  }

  return false;
};

Config.prototype.hookExists = function(hookContext, hookName) {
  return (
    this.isBuiltInHook(hookContext, hookName) ||
    this.isPluginHook(hookContext, hookName) ||
    this.isAdHocHook(hookContext, hookName)
  );
};

Config.prototype.isBuiltInHook = function(hookContext, hookName) {
  hookName = utils.camelCase(hookName);
  var hookPath = path.join(__dirname, '..', 'hook', hookContext.hookScriptName, hookName + '.js');
  return fse.existsSync(hookPath);
};

Config.prototype.isPluginHook = function(hookContextOrType, hookName) {
  var hookType = typeof hookContextOrType === 'string' ? hookContextOrType : hookContextOrType.hookScriptName;
  var hookPath = path.join(this.pluginDirectory(), hookType, hookName + '.js');
  return fse.existsSync(hookPath);
};

Config.prototype.pluginDirectory = function() {
  var pluginDirectory = this.json['pluginDirectory'] || '.git-hooks';
  return path.join(gitRepo.repoRoot(), pluginDirectory);
};

Config.prototype.isAdHocHook = function(hookContext, hookName) {
  var hookConf = this.json[hookContext.hookConfigName] || {};
  hookConf = hookConf[hookName];

  if (!hookConf) { return false; }

  return (
    !this.isBuiltInHook(hookContext, hookName) &&
    !this.isPluginHook(hookContext, hookName) &&
    (hookConf.command || hookConf.requiredExecutable)
  );
};

var operatorFunction = {
  '+':  function(a, b) { return a + b; },
  '-':  function(a, b) { return a - b; },
  '*':  function(a, b) { return a * b; },
  '/':  function(a, b) { return a / b; },
  '\\': function(a, b) { return a / b; }
};

Config.prototype.concurrency = function() {
  if (!this._concurrency) {
    var cores = utils.processorCount();
    var content = this.json.concurrency || '%{processors}';

    if (typeof content === 'string') {
      var concurrencyExpr = content.replace('%{processors}', cores);
      var matches = /(\d+)\s*([+\-*\/])\s*(\d+)/.exec(concurrencyExpr);
      if (matches) {
        var sideA = matches[1];
        var op = matches[2];
        var sideB = matches[3];
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
};

function gatherSkippedHooks(env) {
  var skippedHookStr = '';
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

module.exports = Config;
