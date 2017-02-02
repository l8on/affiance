var BuiltInHookLoader = require('./hook-loader/BuiltInHookLoader');
var PluginHookLoader = require('./hook-loader/PluginHookLoader');

function HookRunner(config, logger, context, printer) {
  this.config = config;
  this.logger = logger;
  this.context = context;
  this.printer = printer;

  this.interrupted = false;
  this.failed = false;
  this.warned = false;

  this._hooks = [];
  // TODO consider setting up locking infrastructure to run hooks in parallel.
}

HookRunner.prototype.run = function() {
  this.loadHooks();
  this.context.setupEnvironment();

  var runHooksResult = false;

  try {
    runHooksResult = this.runHooks();

  } catch(e) {
    this.logger.debug('Caught error running hooks,', e.message);
    if (e.stack) { this.logger.debug(e.stack); }

  } finally {
    this.context.cleanupEnvironment();
  }

  return runHooksResult;
};

HookRunner.prototype.runHooks = function() {
  var enabledHooks = this._hooks.filter(function(hook) { return hook.isEnabled(); });
  if (!enabledHooks.length) {
    this.printer.nothingToRun();
    return true;
  }

  // TODO sort hooks by needed processors when implementing concurrency
  this.printer.startRun();

  var self = this;
  this._hooks.forEach(function(hook) {
    self.runHook(hook)
  });

  this.printResults();

  return !(this.failed || this.interrupted);
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

  var builtInHookLoader = new BuiltInHookLoader(this.config, this.context, this.logger);
  var pluginHookLoader = new PluginHookLoader(this.config, this.context, this.logger);

  this._hooks = this._hooks.concat(builtInHookLoader.loadHooks());
  this._hooks = this._hooks.concat(pluginHookLoader.loadHooks());

  // TODO figure out what errors to catch
};

HookRunner.prototype.runHook = function(hook) {
  var status = null;
  var output = null;

  if (this.shouldSkip(hook)) { return; }

  var hookResult = hook.wrapRun();
  if (hookResult.status == 'fail') { this.failed = true; }
  if (hookResult.status == 'warn') { this.warned = true; }

  if (!this.interrupted) {
    this.printer.endHook(hook, hookResult.status, hookResult.output);
  }

  return hookResult.status;
};

HookRunner.prototype.shouldSkip = function(hook) {
  if (!hook.isEnabled) { return true; }

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
