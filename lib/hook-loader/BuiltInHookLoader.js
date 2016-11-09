var AffianceError = require('../error');
var path = require('path');
var HookLoaderBase = require('./Base');

function BuiltInHookLoader(config, context, logger) {
  HookLoaderBase.constructor.appy(this, arguments);
}

Object.assign(BuiltInHookLoader.prototype, HookLoaderBase.prototype);

BuiltInHookLoader.prototype.loadHooks = function() {
  var self = this;
  return this.config.enabledBuiltInHooks(this.context).map(function(hookName) {
    var hookModulePath = path.join(__dirname, '..', 'hook', this.context.hookScriptName, hookName);

    try {
      var HookModuleClass = require(hookModulePath);
      return self.createHook(hookName, HookModuleClass);

    } catch(e) {
      if(e.code === 'MODULE_NOT_FOUND') {
        throw AffianceError.error(AffianceError.HookLoadError, 'Unable to load hook module "' + hookName + '"', e);
      }
      // Rethrow unknown error
      throw e;
    }
  });
};

