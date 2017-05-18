'use strict';
const _ = require('lodash');
const utils = require('../utils');
const fileUtils = require('../fileUtils');
const AffianceError = require('../error');
const HookMessage = require('./Message');
const HookMessageProcessor = require('./MessageProcessor');

/**
 * @class HookBase
 * @classdesc The base implementation for a hook.
 *   Provides common methods for getting standard meta data about
 *   the hook and enforcing common configuration based features
 *   like checking for required executables.
 *
 * @property {object} config - the hook specific config as a plain object
 * @property {HookContextBase} context - an instance of the hook script's context
 */
module.exports = class HookBase {
  /**
   * Create a hook instance.
   * It will use the context to find the configuration specific
   * to this hook and assign the flat object to config.
   *
   * @param {Config} config - the full HookConfig instance.
   * @param {HookContextBase} context - the hook context
   */
  constructor(config, context) {
    this.config = _.extend({}, config.forHook(this.hookName(), context.hookConfigName));
    this.context = context;
  }

  /**
   * The name of the hook.
   * This the same CapitalCamelCase name as found in the the
   * `default.yml` file or the custom hook's name in the plugin directory.
   * Can be set directly by subclasses, but defaults to `constructor.name`
   *
   * @returns {string} - the hook's name
   */
  hookName() {
    if(!this._hookName) {
      this._hookName = this.constructor.name;
    }
    return this._hookName;
  }

  /**
   * The name of the hook.
   * This the same CapitalCamelCase name as found in the the
   * `default.yml` file or the custom hook's name in the plugin directory.
   * Can be set directly by subclasses, but defaults to `constructor.name`
   *
   * @params {string} hookName - the hook's name
   * @returns {this} - the hook instance in case you want to chain.
   */
  setHookName(hookName) {
    this._hookName = hookName;
    return this;
  }

  /**
   * Run the hook. Subclasses _must_ implement this method.
   *
   * @abstract
   */
  run() { throw new Error('Hook must define `run`'); }


  /**
   * The wrapped result of a hook's `run` method.
   * @typedef {object} HookResult
   * @property {string} status - the status of the hook run {fail, warn, pass}
   * @property {output} string - the output of the hook run
   */

  /**
   * Wrap the run function with the configured environment after
   * checking that all requirements are met to run the hook.
   * Will return a promise that resulves with a result object like
   *
   *
   * @returns {Promise}
   * @resolve {HookResult} - a hook result object
   * @rejects {Error} - an error thrown during the hook run
   */
  wrapRun() {
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

  }

  /**
   * Wrap the run function with the configured environment before running.
   * Will also wrap the run's result with a promise if the hook runs synchronously.
   *
   * @returns {Promise}
   * @resolve {*} - the return value of the hook's `run` method
   * @rejects {Error} - an error thrown during the hook run
   */
  wrapEnvAroundRun() {
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
  }

  /**
   * A description of the hook.
   * If no description is configured, will use the default of:
   *  Run HookName
   *
   * @returns {string}
   */
  description() {
    return this.config['description'] || `Run ${this.hookName()}`;
  }

  /**
   * Returns true if the hook is required.
   * Required hooks can't be skipped.
   *
   * @returns {boolean}
   */
  isRequired() {
    return !!this.config['required'];
  }

  /**
   * Returns true if the hook is configured to parallelize itself.
   *
   * @returns {boolean}
   */
  canParallelize() {
    return this.config['parallelize'] !== false;
  }

  /**
   * Returns the number of processors to use to run this hook.
   * Defaults to 1 if `processors` not configured.
   *
   * @returns {number}
   */
  processors() {
    return this.config['processors'] ? parseInt(this.config['processors'], 10) : 1;
  }

  /**
   * Returns true if the hook is configured to run quietly
   *
   * @returns {boolean}
   */
  isQuiet() {
    return !!this.config['quiet'];
  }

  /**
   * Returns true if the hook is enabled.
   *
   * @returns {boolean}
   */
  isEnabled() {
    return this.config['enabled'] !== false;
  }

  /**
   * Returns true if the hook can be skipped.
   *
   * @returns {boolean}
   */
  canSkip() {
    return !!this.config['skip'];
  }

  /**
   * Returns true if the hook can be run.
   * To be run a hook needs to be enabled and, if it requires files,
   * that there are files to run against.
   *
   * @returns {boolean}
   */
  canRun() {
    return this.isEnabled() && !(this.config['requiresFiles'] && !this.applicableFiles().length);
  }

  /**
   * The result object of a ChildProcess.spawnSync call.
   * @typedef {object} SpawnResult
   * @property {number} pid - Pid of child process
   * @property {Array} output - Array of results from stdio output
   * @property {Buffer|string} stdout - The contents of output[1]
   * @property {Buffer|string} stderr - The contents of output[2]
   * @property {number} status - The exit code of the child process
   * @property {string} signal - The signal used to kill the child process
   * @property {Error} error - The error object if the child process failed or timed out
   */

  /**
   * Synchronously executes a command with the provided arguments.
   * The command, args, and options are passed through to `ChildProcess#spawnSync`
   *
   * @returns {SpawnResult} the result of the spawned process
   */
  execute(command, args, options) {
    args = args || [];
    options = options || {};

    return utils.spawnSync(command, args, options);
  }

  /**
   * Synchronously executes the configured command on applicable files.
   *
   * @returns {SpawnResult} the result of the spawned process
   */
  executeCommandOnApplicableFiles() {
    let commandArgs = _.compact(this.flags().concat(this.applicableFiles()));
    return this.execute(this.command(), commandArgs);
  }

  /**
   * Asynchronously executes a command with the provided arguments.
   *
   * @returns {ChildProcess} the spawned ChildProcess instance
   */
  spawnCommand(command, args, options) {
    args = args || [];
    options = options || {};

    return utils.spawn(command, args, options);
  }

  /**
   * Asynchronously executes a command with the provided arguments.
   * Respects the processCount by requesting a process slot from
   * the hook context before spawning the process.
   *
   * @param {string} command - the name of the command to run
   * @param {string[]} args - a list of arguments to provide to the command
   * @param {object} options - options to provide to `ChildProcess.spawn`
   *
   * @returns {Promise} a promise wrapping the spawned process.
   * @resolve {SpawnResult} the result of the spawned process resolves the returned promise
   * @rejects {Error} an error thrown or emitted during the process run
   */
  spawnPromise(command, args, options) {
    return new Promise((resolve, reject) => {
      let result = {
        pid: null,
        error: null,
        output: null,
        stdout: '',
        stderr: '',
        status: null,
        signal: null
      };

      this.context.waitForProcessSlot().then((slotId) => {
        let commandProcess = this.spawnCommand(command, args, options);
        result.pid = commandProcess.pid || 'no-pid';

        if (this.debugLoggingEnabled()) {
          console.log(`${this.hookName()} spawned ${command} process: ${result.pid}`);
        }

        commandProcess.stdout.on('data', (data) => { result.stdout += data; });
        commandProcess.stderr.on('data', (data) => { result.stderr += data; });
        commandProcess.on('close', (code, signal) => {
          this.context.releaseProcessSlot(slotId);

          // Reject the promise with the named affiance error if we received a SIGINT signal.
          if (result.signal === 'SIGINT') {
            return reject(AffianceError.error(
              AffianceError.InterruptReceived,
              'Hook interrupted while running shell command'
            ));
          }

          result.output = commandProcess.stdio;
          result.status = code;
          result.signal = signal;
          if (this.debugLoggingEnabled()) {
            console.log(`${this.hookName()} closed ${command} process: ${result.pid}`);
          }
          resolve(result);
        });

        commandProcess.on('error', (err) => {
          this.context.releaseProcessSlot(slotId);
          if (this.debugLoggingEnabled()) {
            console.log(`${this.hookName()} errored ${command} process: ${result.pid}`);
          }
          result.error = err;
          resolve(result);
        });

      }, reject);
    });
  }

  debugLoggingEnabled() {
    return this._debug || process.env.LOG_LEVEL === 'debug';
  }

  /**
   * Returns the number of processes the hook should use.
   *
   * @returns {number}
   */
  processCount() {
    return this.canParallelize() ? this.processors() : this.context.config.concurrency();
  }

  /**
   * Spawns commands concurrently on chunks of files in order
   * to achieve better performance while respecting the limit on number of
   * spawned child processes.
   *
   * This works well with hooks who rely on commands that can receive a
   * list of files to run against as extra command line arguments.
   * This chunks the list of applicable files into a chunk for each
   * `processCount`. It then invokes the command asynchronously on each
   * chunk of files. Finally, it resolves the returned promise with
   * the combined output of each process.
   *
   * @returns {Promise} a promise wrapping the spawned processes.
   * @resolve {SpawnResult} the combined result of the spawned processes
   * @rejects {Error} an error thrown or emitted during the process run
   */
  spawnPromiseOnApplicableFiles() {
    let numCommands = this.processCount();

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
  }

  /**
   * Returns the configured flags to send to the command
   *
   * @returns {string[]}
   */
  flags() {
    return _.compact([].concat(this.config['flags']));
  }

  /**
   * Returns the list of files this hook applies to.
   * @returns {string[]} applicable file paths
   */
  applicableFiles() {
    if (!this._applicableFiles) {
      this._applicableFiles = this.selectApplicable(this.context.modifiedFiles());
    }
    return this._applicableFiles;
  }

  /**
   * Returns the list of files that could possibly be included.
   *
   * @returns {string[]} included file paths
   */
  includedFiles() {
    if (!this._includedFiles) {
      this._includedFiles = this.selectApplicable(this.context.allFiles());
    }
    return this._includedFiles;
  }

  /**
   * Select the applicable files out of a list of file paths.
   *
   * @param {string[]} filePaths - select applicable files out of a list of file paths
   * @returns {string[]} the applicable file paths
   */
  selectApplicable(filePaths) {
    return filePaths.filter((filePath) => {
      return this.isApplicable(filePath);
    });
  }

  /**
   * Check if a path is applicable to the hook.
   * Considers the `include` and `exclude` configuration of the hook.
   *
   * @param {string} filePath - the absolute path of the file.
   * @returns {boolean}
   */
  isApplicable(filePath) {
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
  }

  /**
   * Process the raw hook return value and case to a HookResult object.
   *
   * @param {*} hookReturnValue - the return value of the hook#run method.
   * @returns {HookResult}
   */
  processHookReturnValue(hookReturnValue) {
    // Could be an array of `HookMessage` objects for more complex hooks.
    if (Array.isArray(hookReturnValue) &&
      (!hookReturnValue.length || hookReturnValue[0] instanceof HookMessage)) {
      let messageProcessor = new HookMessageProcessor(this, this.config['problemOnUnmodifiedLine']);
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
  }

  /**
   * Check for requirements to run the hook.
   * Returns a string of instructions if there are missing requirements.
   *
   * @returns {string|undefined}
   */
  checkForRequirements() {
    return this.checkForExecutable() || this.checkForLibraries();
  }

  /**
   * Checks if the required executable is indeed executable.
   * Returns a message if something is wrong.
   *
   * @returns {string|unedefined}
   */
  checkForExecutable() {
    // If this hook doesn't require an executable, or it is in the path continue
    if (!this.requiredExecutable() || utils.isInPath(this.requiredExecutable())) {
      return;
    }

    let output = this.requiredExecutable() + ' is not installed, not in your PATH, ';
    output += 'or does not have execute permissions';
    output += this.installCommandPrompt();

    return output;
  }

  /**
   * Returns the configured instructions to install the command
   *
   * @returns {string}
   */
  installCommandPrompt() {
    let installCommand = '';
    if (this.context.config.useGlobalNodeModules() && this.config['globalInstallCommand']) {
      installCommand = this.config['globalInstallCommand'];
    } else {
      installCommand = this.config['installCommand'];
    }

    if (installCommand) {
      return `\nInstall it by running ${installCommand}`;
    } else {
      return '';
    }
  }

  /**
   * Ensures referenced node module libraries can be loaded.
   * Returns a message if something is wrong.
   *
   * @returns {string|undefined}
   */
  checkForLibraries() {
    // If global node modules are being used, do not try to require them.
    if (this.context.config.useGlobalNodeModules()) { return; }

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

    return output.join('\n');
  }

  /**
   * Returns the configured required executable
   *
   * @returns {string|undefined}
   */
  requiredExecutable() {
    if (this.context.config.useGlobalNodeModules() && this.config['globalRequiredExecutable']) {
      return this.config['globalRequiredExecutable'];
    } else {
      return this.config['requiredExecutable'];
    }
  }

  /**
   * Returns the list of required libraries
   *
   * @returns {string[]}
   */
  requiredLibraries() {
    if (!this._requiredLibraries) {
      let configuredLibraries = this.config['requiredLibrary'] || this.config['requiredLibraries'];
      this._requiredLibraries = (configuredLibraries && configuredLibraries.length) ? [].concat(configuredLibraries) : [];
    }

    return this._requiredLibraries;
  }

  /**
   * The command to run to handle the hook.
   *
   * @returns {string|undefined}
   */
  command() {
    return this.config['command'] || this.requiredExecutable();
  }

  /**
   * Transforms the status based on the hook's configuration.
   *
   * @param {string} status - the status of the hook
   * @returns {string}
   */
  transformStatus(status) {
    switch(status) {
      case 'fail':
        return this.config['onFail'] || 'fail';
      case 'warn':
        return this.config['onWarn'] || 'warn';
      default:
        return status;
    }
  }

  /**
   * Delegate a list of method names to the hook's context.
   *
   * @static
   * @param {HookBase} SubClass - A hook subclass
   * @param {string[]} contextDelegations - A list of methods to delegate
   */
  static delegateToContext(SubClass, contextDelegations) {
    contextDelegations.forEach((delegateMethod) => {
      SubClass.prototype[delegateMethod] = function() {
        return this.context[delegateMethod].apply(this.context, arguments);
      };
    });
  }
};

