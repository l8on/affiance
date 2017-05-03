'use strict';
const AffianceError = require('../error');
const path = require('path');
const HookLoaderBase = require('./Base');

module.exports = class BuiltInHookLoader extends HookLoaderBase {
  loadHooks() {
    return this.config.enabledBuiltInHooks(this.context).map((hookName) => {
      let hookModulePath = path.join(__dirname, '..', 'hook', this.context.hookScriptName, hookName);

      try {
        let HookModuleClass = require(hookModulePath);
        return this.createHook(hookName, HookModuleClass);

      } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw AffianceError.error(AffianceError.HookLoadError, 'Unable to load hook module "' + hookName + '"', e);
        }
        // Rethrow unknown error
        throw e;
      }
    });
  }
};
