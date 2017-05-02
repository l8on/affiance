"use strict";
const _ = require('lodash');
const utils = require('../utils');
const fileUtils = require('../fileUtils');
const AffianceError = require('../error');
const HookMessage = require('./Message');
const HookMessageProcessor = require('./MessageProcessor');

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
  // Any output is bad here.
  let requirementsOutput = this.checkForRequirements();

  if (requirementsOutput) {
    return Promise.resolve({
      status: 'fail',
      output: requirementsOutput
    });
  }

  return new Promise((resolve, reject) => {
    // Since we allow hooks to configure their own environment, we wrap the run call
    // with a temporary change to process.env
    this.wrapEnvAroundRun().then((hookReturnValue) => {
      let runResult = this.processHookReturnValue(hookReturnValue);
      runResult.status = this.transformStatus(runResult.status);
      resolve(runResult);
    }, reject);
  });

};

HookBase.prototype.wrapEnvAroundRun = function() {
  let oldEnv = _.defaultsDeep({}, process.env);
  // Merge the configured env with the old env, using the current env as the defaults.
  let runEnv = _.defaultsDeep({}, this.config['env'] || {}, oldEnv);
  // Set the process env so the hook can run with it's configured env set.
  process.env = runEnv;

  // Run the hook!
  let hookRunPromise = this.run();

  // Coerce result into a Promise when hook has simple return value
  if (!(hookRunPromise instanceof Promise)) {
    hookRunPromise = Promise.resolve(hookRunPromise);
  }

  // Close over `oldEnv` to reset after hook result is resolved.
  // Reset env back to normal.
  let afterHookRun = () => {
    process.env = oldEnv;
  };

  hookRunPromise.then(afterHookRun, afterHookRun);
  return hookRunPromise;
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
  let commandArgs = _.compact(this.flags().concat(this.applicableFiles()));
  return this.execute(this.command(), commandArgs);
};

HookBase.prototype.spawnCommand = function(command, args, options) {
  args = args || [];
  options = options || {};

  return utils.spawn(command, args, options);
};

HookBase.prototype.spawnPromise = function(command, args, options) {
  return new Promise((resolve, reject) => {
    let result = {
      status: null,
      signal: null,
      stderr: '',
      stdout: ''
    };

    let commandProcess = this.spawnCommand(command, args, options);
    commandProcess.stdout.on('data', (data) => { result.stdout += data; });
    commandProcess.stderr.on('data', (data) => { result.stderr += data; });
    commandProcess.on('close', (code, signal) => {
      // Reject the promise with the named affiance error if we received a SIGINT signal.
      if (result.signal === 'SIGINT') {
        return reject(AffianceError.error(
          AffianceError.InterruptReceived,
          'Hook interrupted while running shell command'
        ));
      }

      result.status = code;
      result.signal = signal;
      resolve(result);
    });

    commandProcess.on('error', reject);
  });
};

HookBase.prototype.spawnConcurrentCommandsOnApplicableFiles = function() {
  let numCommands = this.canParallelize() ? this.processors() : this.context.config.concurrency();

  // Find the size of each chunk of files to process to maximize parallelism
  let chunkSize = Math.ceil(this.applicableFiles().length / numCommands);
  let fileChunks = _.chunk(this.applicableFiles(), chunkSize);
  return new Promise((resolve, reject) => {
    // Spawn and gather promises that will resolve when the commands exit
    let commandPromises = fileChunks.map((applicableFilesChunk) => {
      let commandArgs = _.compact(this.flags().concat(applicableFilesChunk));
      return this.spawnPromise(this.command(), commandArgs);
    });

    // Gather all child process results into a single result object and to
    // concatenate output in the order they were run
    Promise.all(commandPromises).then((commandResults) => {
      let result = {
        status: null,
        signal: null,
        stderr: '',
        stdout: ''
      };
      commandResults.forEach((commandResult) => {
        result.status = result.status || commandResult.status || 0;
        result.signal = result.signal || commandResult.signal || null;
        result.stdout += commandResult.stdout;
        result.stderr += commandResult.stderr;
      });

      // Resolve the promise with the combined result
      resolve(result);
    }, reject);
  });
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
  return filePaths.filter((filePath) => {
    return this.isApplicable(filePath);
  });
};

HookBase.prototype.isApplicable = function(filePath) {
  let includes = _.compact(_.flatten([].concat(this.config['include']))).map(fileUtils.convertGlobToAbsolute.bind(fileUtils));
  let included = !includes.length;
  for (let i in includes) {
    if (fileUtils.matchesPath(includes[i], filePath)) {
      included = true;
      break;
    }
  }

  let excluded = false;
  let excludes = _.compact(_.flatten([].concat(this.config['exclude']))).map(fileUtils.convertGlobToAbsolute.bind(fileUtils));
  for (let j in excludes) {
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
    let messageProcessor = new HookMessageProcessor(this, this.config['problemOnUmnodifiedLine']);
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

  let output = this.requiredExecutable() + ' is not installed, not in your PATH, ';
  output += 'or does not have execute permissions';
  output += this.installCommandPrompt();

  return output;
};

HookBase.prototype.installCommandPrompt = function() {
  let installCommand = this.config['installCommand'];
  if (installCommand) {
    return "\nInstall it by running " +  installCommand;
  } else {
    return ''
  }
};

HookBase.prototype.checkForLibraries = function() {
  let output = [];
  this.requiredLibraries().forEach((library) => {
    try {
      require(library);
    } catch(e) {
      // Do not swallow any other type of error.
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw(e);
      }

      let outputMsg = 'Unable to load "' + library + '"';
      outputMsg += this.installCommandPrompt();
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
    let configuredLibraries = this.config['requiredLibrary'] || this.config['requiredLibraries'];
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
