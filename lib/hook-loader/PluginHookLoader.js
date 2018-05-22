'use strict';
const fse = require('fs-extra');
const path = require('path');
const fileUtils = require('../fileUtils');
const utils = require('../utils');
const AffianceError = require('../error');
const HookLoaderBase = require('./Base');
const HookSigner = require('../HookSigner');

module.exports = class PluginHookLoader extends HookLoaderBase {
  loadHooks() {
    if (this.config.shouldVerifySignatures()) {
      this.checkForModifiedPlugins();
    }

    let hooks = this.pluginPaths().map((hookPath) => {
      return this.createPluginHook(hookPath);
    });

    let adhocHooks = this.adHocHookNames().map((hookName) => {
      return this.createAdHocHook(hookName);
    });

    return hooks.concat(adhocHooks);
  }

  updateSignatures() {
    if (!this.modifiedPluginSigners().length) {
      this.logger.success('No plugin signatures have changed');
    }

    this.modifiedPluginSigners().forEach((hookSigner) => {
      hookSigner.updateSignature();
      this.logger.warn('Updated signature of plugin ' + hookSigner.hookName);
    });
  }

  pluginPaths() {
    if (!this._pluginPaths) {
      let hookDirectoryPath = path.join(this.config.pluginDirectory(), this.context.hookScriptName);
      if (fileUtils.isDirectory(hookDirectoryPath)) {
        let directoryContents = fse.readdirSync(hookDirectoryPath);
        this._pluginPaths = directoryContents
          .sort()
          .filter(function (childPath) { return !!childPath.match(/(\.js|\.coffee)$/); })
          .map(function (childPath) { return path.join(hookDirectoryPath, childPath); });
      } else {
        this._pluginPaths = [];
      }
    }

    return this._pluginPaths;
  }

  pluginHookNames() {
    if (!this._pluginHookNames) {
      this._pluginHookNames = this.pluginPaths().map(function(pluginPath) {
        return utils.camelCase(path.basename(pluginPath, '.js'));
      });
    }

    return this._pluginHookNames;
  }

  allHookNames() {
    if(!this._allHookNames) {
      this._allHookNames = this.pluginHookNames().concat(this.adHocHookNames());
    }

    return this._allHookNames;
  }

  adHocHookNames() {
    if(!this._adHocHookNames) {
      this._adHocHookNames = this.config.enabledAdHocHooks(this.context);
    }

    return this._adHocHookNames;
  }

  modifiedPluginSigners() {
    return this.allHookNames().map((hookName) => {
      return new HookSigner(hookName, this.config, this.context);
    }).filter((hookSigner) => {
      return hookSigner.hasSignatureChanged();
    });
  }

  checkForModifiedPlugins() {
    let modifiedPluginSigners = this.modifiedPluginSigners();
    if (!modifiedPluginSigners.length) { return; }

    this.logger.warnBold(
      'The following ' + this.context.hookScriptName + ' plugins ' +
      'have been added, changed, or had their configuration modified:'
    );
    this.logger.newline();

    modifiedPluginSigners.forEach((pluginSigner) => {
      this.logger.warn(' * ' + pluginSigner.hookName + ' in ' + pluginSigner.hookPath());
    });
    this.logger.newline();
    this.logger.warnBold('You should verify the changes and then run:');
    this.logger.newline();
    this.logger.warnBold('affiance sign --hook ' + this.context.hookScriptName);
    this.logger.newline();
    this.logger.log('For more information, see github.com/l8on/affiance#security');

    throw AffianceError.error(AffianceError.InvalidHookSignature);
  }

  createPluginHook(hookPath) {
    try {
      let HookClass = require(hookPath);
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
  }

  createAdHocHook(hookName) {
    let BaseHookClass = require(path.join('..', 'hook', this.context.hookScriptName, 'Base'));

    // Create a subclass with a very simple run function
    class HookClass extends BaseHookClass {
      run() {
        let result = this.context.executeHook(this.command(), this.flags());

        if (result.status === 0) {
          return 'pass';
        } else {
          return ['fail', result.stdout.toString() + result.stderr.toString()];
        }
      }
    }

    // Shim hook name such that config look-ups are successful
    HookClass.prototype.hookName = function() { return hookName; };
    HookClass.prototype._hookName = hookName;

    return new HookClass(this.config, this.context);
  }
};
