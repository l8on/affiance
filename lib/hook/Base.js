var _ = require('lodash');
var path = require('path');
var utils = require('../utils');
var fileUtils = require('../fileUtils');
var gitRepo = require('../gitRepo');
var HookMessage = require('./Message');
var HookMessageProcessor = require('./MessageProcessor');

function HookBase(config, context) {
  this.config = _.extend({}, config.forHook(this.hookName(), context.hookConfigName));
  this.context = context;
}

HookBase.delegateToContext = function(SubClass, contextDelegations) {
  contextDelegations.forEach(function(delegateMethod) {
    SubClass.prototype[delegateMethod] = function() {
      return this.context[delegateMethod].apply(this.context, arguments);
    }
  });
};

HookBase.prototype.hookName = function() {
  if(!this._hookName) {
    this._hookName = this.constructor.name;
  }
  return this._hookName
};

HookBase.prototype.setHookName = function(hookName) {
  this._hookName = hookName;
  return this;
};

HookBase.prototype.run = function() {
  throw new Error('Hook must define `run`');
};

HookBase.prototype.wrapRun = function() {
  var runResult = {
    status: null,
    output: ''
  };

  // Any output is bad here.
  runResult.output = this.checkForRequirements();

  if (runResult.output) {
    runResult.status = 'fail';
  } else {
    // Since we allow hooks to configure their own environment, we wrap the run call
    // with a temporary change to process.env
    var hookReturnValue = this.wrapEnvAroundRun();

    runResult = this.processHookReturnValue(hookReturnValue);
    runResult.status = this.transformStatus(runResult.status);
  }

  return runResult;
};

HookBase.prototype.wrapEnvAroundRun = function() {
  var oldEnv = _.defaultsDeep({}, process.env);
  // Merge the configured env with the old env, using the current env as the defaults.
  var runEnv = _.defaultsDeep({}, this.config['env'] || {}, oldEnv);
  // Set the process env so the hook can run with it's configured env set.
  process.env = runEnv;
  // Run the hook!
  var hookReturnValue = this.run();
  // Reset env back to normal.
  process.env = oldEnv;

  return hookReturnValue;
};

HookBase.prototype.description = function() {
  return this.config['description'] || "Run " + this.hookName();
};

HookBase.prototype.isRequired = function() {
  return !!this.config['required'];
};

HookBase.prototype.canParallelize = function() {
  return this.config['parallelize'] !== false;
};

HookBase.prototype.processors = function() {
  return this.config['processors'] || 1;
};

HookBase.prototype.isQuiet = function() {
  return !!this.config['quiet'];
};

HookBase.prototype.isEnabled = function() {
  return this.config['enabled'] !== false;
};

HookBase.prototype.canSkip = function() {
  return !!this.config['skip'];
};

HookBase.prototype.canRun = function() {
  return this.isEnabled() && !(this.config['requiresFiles'] && !this.applicableFiles().length)
};

HookBase.prototype.execute = function(command, args, options) {
  args = args || [];
  options = options || {};

  return utils.spawnSync(command, args, options);
};

HookBase.prototype.executeCommandOnApplicableFiles = function() {
  var commandArgs = _.compact(this.flags().concat(this.applicableFiles()));
  return this.execute(this.command(), commandArgs);
};

HookBase.prototype.flags = function() {
  return _.compact([].concat(this.config['flags']));
};

HookBase.prototype.applicableFiles = function() {
  if (!this._applicableFiles) {
    this._applicableFiles = this.selectApplicable(this.context.modifiedFiles());
  }
  return this._applicableFiles
};

HookBase.prototype.includedFiles = function() {
  if (!this._includedFiles) {
    this._includedFiles = this.selectApplicable(this.context.allFiles());
  }
  return this._includedFiles
};

HookBase.prototype.selectApplicable = function(filePaths) {
  var self = this;
  return filePaths.filter(function(filePath) {
    return self.isApplicable(filePath);
  });
};

HookBase.prototype.isApplicable = function(filePath) {
  var includes = _.compact(_.flatten([].concat(this.config['include']))).map(fileUtils.convertGlobToAbsolute.bind(fileUtils));
  var included = !includes.length;
  for (var i in includes) {
    if (fileUtils.matchesPath(includes[i], filePath)) {
      included = true;
      break;
    }
  }

  var excluded = false;
  var excludes = _.compact(_.flatten([].concat(this.config['exclude']))).map(fileUtils.convertGlobToAbsolute.bind(fileUtils));
  for (var j in excludes) {
    if (fileUtils.matchesPath(excludes[j], filePath)) {
      excluded = true;
      break;
    }
  }
  return (included && !excluded);
};

HookBase.prototype.processHookReturnValue = function(hookReturnValue) {
  // Could be an array of `HookMessage` objects for more complex hooks.
  if (Array.isArray(hookReturnValue) &&
      (!hookReturnValue.length || hookReturnValue[0] instanceof HookMessage)) {
    var messageProcessor = new HookMessageProcessor(this, this.config['problemOnUmnodifiedLine']);
    return messageProcessor.hookResult(hookReturnValue);

  // Could be an array of strings where the first is the status, and the second is the output
  } else if (Array.isArray(hookReturnValue) && typeof hookReturnValue[0] === 'string' && hookReturnValue.length === 2){
    return { status: hookReturnValue[0], output: hookReturnValue[1] };

  // Could be a lonely string that indicates the status
  } else if (typeof hookReturnValue === 'string') {
    return { status: hookReturnValue };

  // Could be a properly formed hookResult object already.
  } else {
    return hookReturnValue;
  }
};

HookBase.prototype.checkForRequirements = function() {
  return this.checkForExecutable() || this.checkForLibraries();
};

HookBase.prototype.checkForExecutable = function() {
  // If this hook doesn't require an executable, or it is in the path continue
  if (!this.requiredExecutable() || utils.isInPath(this.requiredExecutable())) {
    return;
  }

  var output = this.requiredExecutable() + ' is not installed, not in your PATH, ';
  output += 'or does not have execute permissions';
  output += this.installCommandPrompt();

  return output;
};

HookBase.prototype.installCommandPrompt = function() {
  var installCommand = this.config['installCommand'];
  if (installCommand) {
    return "\nInstall it by running " +  installCommand;
  } else {
    return ''
  }
};

HookBase.prototype.checkForLibraries = function() {
  var output = [];
  var self = this;

  this.requiredLibraries().forEach(function(library) {
    try {
      require(library);
    } catch(e) {
      // Do not swallow any other type of error.
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw(e);
      }

      var outputMsg = 'Unable to load "' + library + '"';
      outputMsg += self.installCommandPrompt();
      output.push(outputMsg);
    }
  });

  if(!output.length) { return; }

  return output.join("\n");
};

HookBase.prototype.requiredExecutable = function() {
  return this.config['requiredExecutable'];
};

HookBase.prototype.requiredLibraries = function() {
  if (!this._requiredLibraries) {
    var configuredLibraries = this.config['requiredLibrary'] || this.config['requiredLibraries'];
    this._requiredLibraries = (configuredLibraries && configuredLibraries.length) ? [].concat(configuredLibraries) : [];
  }

  return this._requiredLibraries;
};

HookBase.prototype.command = function() {
  return this.config['command'] || this.requiredExecutable();
};

HookBase.prototype.transformStatus = function(status) {
  switch(status) {
    case 'fail':
      return this.config['onFail'] || 'fail';
    case 'warn':
      return this.config['onWarn'] || 'warn';
    default:
      return status;
  }
};

module.exports = HookBase;
