var AffianceError = require('../error');

function HookContext() {
}

HookContext.createContext = function(hookType, config, argv, input) {
  try {
    var HookContextClass = require('./' + hookType);
    return new HookContextClass(config, argv, input);

  } catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw(e);
    }

    throw AffianceError.error(
      AffianceError.HookContextLoadError,
      'Unable to load ' + hookType + ' hook context'
    );
  }
};

module.exports = HookContext;
