"use strict";
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

  try {
    runHooksResult = this.runHooks();

  } catch(e) {
    this.logger.debug('Caught error running hooks,', e.message);
    if (e.stack) { this.logger.debug(e.stack); }

  } finally {
    this.context.cleanupEnvironment();
  }

  return runHooksResult || Promise.reject(false);
};

HookRunner.prototype.runHooks = function() {
  let enabledHooks = this._hooks.filter((hook) => { return hook.isEnabled(); });
  if (!enabledHooks.length) {
    this.printer.nothingToRun();
    return Promise.resolve(true);
  }
  // TODO sort hooks by needed processors
  this.printer.startRun();

  let hookPromises = [];
  this._hooks.forEach((hook) => {
    hookPromises.push(this.runHook(hook));
  });

  return new Promise((resolve, reject) => {
    Promise.all(hookPromises).then((_allHookResults) => {
      resolve(!(this.failed || this.interrupted));
    }, reject);
  });
};

HookRunner.prototype.printResults = function() {
  if (this.interrupted) {
    this.printer.runInterrupted();
  } else if (this.failed) {
    this.printer.runFailed();
  } else if (this.warned) {
    this.printer.runWarned()
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
  if (!hook.isEnabled()) { return true; }

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

module.exports = HookRunner;
