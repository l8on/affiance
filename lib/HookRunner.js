'use strict';
const AffianceError = require('./error');
const BuiltInHookLoader = require('./hook-loader/BuiltInHookLoader');
const PluginHookLoader = require('./hook-loader/PluginHookLoader');

function HookRunner(config, logger, context, printer) {
  this.config = config;
  this.logger = logger;
  this.context = context;
  this.printer = printer;

  this.interrupted = false;
  this.failed = false;
  this.warned = false;

  this._hooks = [];
}

HookRunner.prototype.run = function() {
  this.loadHooks();
  this.context.setupEnvironment();
  let runHooksResult = null;

  let handleHookRunError = (e) => {
    this.logger.debug('Caught error running hooks,', e.message);
    if (e.stack) { this.logger.debug(e.stack); }
    this.context.cleanupEnvironment();
  };

  try {
    runHooksResult = this.runHooks();
  } catch(e) {
    handleHookRunError(e);
  }

  runHooksResult = runHooksResult || Promise.reject(false);
  runHooksResult.then((_hookResult) => {
    this.context.cleanupEnvironment();
  }, handleHookRunError);

  return runHooksResult;
};

HookRunner.prototype.runHooks = function() {
  let enabledHooks = this._hooks.filter((hook) => { return hook.isEnabled(); });
  if (!enabledHooks.length) {
    this.printer.nothingToRun();
    return Promise.resolve(true);
  }

  this.setupInterrruptListeners();

  // Sort so hooks requiring fewer processors get queued first. This
  // ensures we make better use of available processors.
  this._hooks.sort((a, b) => {
    let processDiff = a.processCount() - b.processCount();
    if (processDiff !== 0 ) { processDiff; }
    return a.hookName().localeCompare(b.hookName());
  });

  this._hooks.forEach((hook) => { console.log(`Hook to run: ${hook.hookName()}`); });
  this.printer.startRun();

  return new Promise((resolve, reject) => {
    let hookPromises = this._hooks.map((hook) => {
      return this.runHook(hook);
    });

    Promise.all(hookPromises).then((_allHookResults) => {
      resolve(!(this.failed || this.interrupted));

    }).catch((rejectError) => {
      // Handle interrupts specifically
      if (rejectError && rejectError.affianceName === AffianceError.InterruptReceived) {
        this.interrupted = true;
        return resolve(false);
      }
      // Reject any promises waiting for a process slot.
      this.context.clearWaitingQueue();
      return reject(rejectError);
    });
  });
};

HookRunner.prototype.printResults = function() {
  if (this.interrupted) {
    this.printer.runInterrupted();
  } else if (this.failed) {
    this.printer.runFailed();
  } else if (this.warned) {
    this.printer.runWarned();
  } else {
    this.printer.runSucceeded();
  }
};

HookRunner.prototype.loadHooks = function() {
  this._hooks = [];

  let builtInHookLoader = new BuiltInHookLoader(this.config, this.context, this.logger);
  let pluginHookLoader = new PluginHookLoader(this.config, this.context, this.logger);

  this._hooks = this._hooks.concat(builtInHookLoader.loadHooks());
  this._hooks = this._hooks.concat(pluginHookLoader.loadHooks());

  // TODO figure out what errors to catch
};

HookRunner.prototype.runHook = function(hook) {
  if (this.shouldSkip(hook)) { return Promise.resolve(); }

  return new Promise((resolve, reject) => {
    hook.wrapRun().then((hookResult) => {
      if (hookResult.status === 'fail') { this.failed = true; }
      if (hookResult.status === 'warn') { this.warned = true; }

      if (!this.interrupted) {
        this.printer.endHook(hook, hookResult.status, hookResult.output);
      }
      resolve(hookResult.status);
    }, reject);
  });
};

HookRunner.prototype.shouldSkip = function(hook) {
  if (this.interrupted || !hook.isEnabled()) { return true; }

  if (hook.canSkip()) {
    if (hook.isRequired()) {
      this.printer.requiredHookNotSkipped(hook);
    } else {
      if(hook.canRun()) { this.printer.hookSkipped(hook); }
      return true;
    }
  }

  return !hook.canRun();
};

HookRunner.prototype.setupInterrruptListeners = function() {
  process.on('SIGINT', () => {
    console.log('in SIGINT handler');
    this.interrupted = true;
  });
};

module.exports = HookRunner;
