var fse = require('fs-extra');
var path = require('path');
var utils = require('../utils');
var AffianceError = require('../error');
var HookLoaderBase = require('./Base');
var HookSigner = require('../HookSigner');

function PluginHookLoader(config, context, logger) {
  HookLoaderBase.constructor.apply(this, arguments);
}

Object.assign(PluginHookLoader.prototype, HookLoaderBase.prototype);

PluginHookLoader.prototype.loadHooks = function() {
  var self = this;
  if (this.config.shouldVerifySignatures()) {
    this.checkForModifiedPlugins();
  }

  var hooks = this.pluginPaths().map(function(hookPath) {
    return self.createPluginHook(hookPath);
  });

  var adhocHooks = this.adHocHookNames().map(function(hookName) {
    return self.createAdHocHook(hookName);
  });

  return hooks.concat(adhocHooks);
};

PluginHookLoader.prototype.updateSignatures = function() {
  if (!this.modifiedPluginSigners().length) {
    this.logger.success('No plugin signatures have changed');
  }

  var self = this;
  this.modifiedPluginSigners().forEach(function(hookSigner) {
    hookSigner.updateSignature();
    self.logger.warn('Updated signature of plugin ' + hookSigner.hookName());
  });
};

PluginHookLoader.prototype.pluginPaths = function() {
  if (!this._pluginPaths) {
    var hookDirectoryPath = path.join(this.config.pluginDirectory(), this.context.hookScriptName);
    var directoryContents = fse.readdirSync(hookDirectoryPath);
    this._pluginPaths = directoryContents
      .sort()
      .filter(function (childPath) { return !!childPath.match(/(\.js|\.coffee)$/); })
      .map(function (childPath) { return path.join(hookDirectoryPath, childPath); });
  }

  return this._pluginPaths;
};

PluginHookLoader.prototype.pluginHookNames = function() {
  if (!this._pluginHookNames) {
    this._pluginHookNames = this.pluginPaths().map(function(pluginPath) {
      return utils.camelCase(path.basename(pluginPath, '.js'));
    });
  }

  return this._pluginHookNames;
};

PluginHookLoader.prototype.allHookNames = function() {
  if(!this._allHookNames) {
    this._allHookNames = this.pluginHookNames().concat(this.adHocHookNames());
  }

  return this._allHookNames;
};

PluginHookLoader.prototype.adHocHookNames = function() {
  if(!this._adHocHookNames) {
    this._adHocHookNames = this.config.enabledAdHocHooks(this.context);
  }

  return this._adHocHookNames;
};

PluginHookLoader.prototype.modifiedPluginSigners = function() {
  var self = this;

  return this.allHookNames().map(function(hookName) {
    return new HookSigner(hookName, self.config, self.context);
  }).filter(function(hookSigner) {
    return hookSigner.hasSignatureChanged();
  });
};

PluginHookLoader.prototype.checkForModifiedPlugins = function() {
  var modifiedPluginSigners = this.modifiedPluginSigners();
  if (!modifiedPluginSigners.length) { return; }

  this.logger.warnBold(
    'The following ' + this.context.hookScriptName + ' plugins ' +
    'have been added, changed, or had their configuration modified:'
  );
  this.logger.newline();

  var self = this;
  modifiedPluginSigners.forEach(function(pluginSigner) {
    self.warn(' * ' + pluginSigner.hookName + ' in ' + pluginSigner.hookPath())
  });
  this.logger.newline();
  this.logger.warnBold('You should verify the changes and then run:');
  this.logger.newline();
  this.logger.warnBold('affiance --sign ' + this.context.hookScriptName);
  this.logger.newline();
  this.logger.log('For more information, see github.com/l8on/affiance#security');

  throw AffianceError.error(AffianceError.InvalidHookSignature);
};

PluginHookLoader.prototype.createPluginHook = function(hookPath) {
  try {
    var HookClass = require(hookPath);
    return new HookClass(this.config, this.context);

  } catch(e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw AffianceError.error(
        AffianceError.HookLoadError,
        'Unable to load hook ' + hookPath + ' : ' + e.message,
        e
      );
    }

    throw e;
  }
};

PluginHookLoader.prototype.createAdHocHook = function(hookName) {
  var BaseHookClass = require(path.join('..', 'hook', this.context.hookScriptName, 'Base'));

  var HookClass = function() {
    BaseHookClass.constructor.apply(this, arguments);
    this.setHookName(hookName);
  };
  Object.assign(HookClass.prototype, BaseHookClass.prototype);

  HookClass.prototype.run = function() {
    var result = this.context.executeHook(this.command(), this.flags());

    if (result.status === 0) {
      return 'pass';
    } else {
      return ['fail', result.stdout.toString() + result.stderr.toString()];
    }
  };

  return new HookClass(this.config, this.context);
};


