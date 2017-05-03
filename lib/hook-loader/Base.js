'use strict';
const AffianceError = require('../error');

module.exports = class HookLoaderBase {
  constructor(config, context, logger) {
    this.config = config;
    this.context = context;
    this.logger = logger;
  }

  loadHooks() {
    throw new Error('Subclass must define `loadHooks`');
  }

  createHook(hookName, HookModuleClass) {
    try {
      return new HookModuleClass(this.config, this.context);

    } catch(e) {
      throw AffianceError.error(
        AffianceError.HookLoadError,
        'Unable to load hook ' + hookName + ': ' + e.message,
        e
      );
    }
  }
};
