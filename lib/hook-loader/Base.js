var AffiancError = require('../error');

function HookLoaderBase(config, context, logger) {
  this.config = config;
  this.context = context;
  this.logger = logger;
}

HookLoaderBase.prototype.loadHooks = function() {
  throw new Error('Subclass must define `loadHooks`');
};

HookLoaderBase.prototype.createHook = function(hookName, HookModuleClass) {
  try {
    return new HookModuleClass(this.config, this.context);

  } catch(e) {
    throw AffiancError.error(
      AffiancError.HookLoadError,
      'Unable to load hook ' + hookName + ': ' + e.message,
      e
    );
  }
};
