function Printer(config, logger, context) {
  this.config = config;
  this.logger = logger;
  this.context = context;
  // TODO, consider using a lock for things running in parallel.
}

Printer.prototype.startRun = function() {
  if (!this.config.get('quiet')) {
    this.logger.bold('Running', this.hookScriptName(), 'hooks');
  }
};

Printer.prototype.nothingToRun = function() {
  this.logger.debug('✓ No applicable', this.hookScriptName(), 'hooks to run');
};

Printer.prototype.hookSkipped = function(hook) {
  this.logger.warn('Skipping', hook.name);
};

Printer.prototype.requiredHookNotSkipped = function(hook) {
  this.logger.warn('Cannot skip', hook.name, 'since it is required');
};

Printer.prototype.endHook = function(hook, status, output) {
  var endHookMsg = '';

  if ((!hook.isQuiet() && !this.config.get('quiet')) || status !== 'pass') {
    endHookMsg += this.hookHeader(hook);
  }

  this.printResult(hook, status, output, endHookMsg);
};

Printer.prototype.interruptTriggered = function() {
  this.logger.newline();
  this.logger.error('Interrupt signal received. Stopping hooks...');
};

Printer.prototype.runInterrupted = function() {
  this.logger.newline();
  this.logger.warn('⚠  Hook run interrupted by user');
  this.logger.newline();
};

Printer.prototype.runFailed = function() {
  this.logger.newline();
  this.logger.error('✗ One or more', this.hookScriptName(), 'hooks failed');
  this.logger.newline();
};

Printer.prototype.runWarned = function() {
  this.logger.newline();
  this.logger.warn('⚠ All', this.hookScriptName(), 'hooks passed, but with warnings');
  this.logger.newline();
};

Printer.prototype.runSucceeded = function() {
  if (this.config.get('quiet')) { return; }

  this.logger.newline();
  this.logger.success('✓ All', this.hookScriptName(), 'hooks passed');
  this.logger.newline();
};

Printer.prototype.hookScriptName = function() {
  return this.context.hookScriptName;
};

Printer.prototype.hookHeader = function(hook) {
  var hookName = '[' + hook.hookName() + ']';
  var hookDescription = hook.description();
  var numDots = Math.max(70 - hookDescription.length - hookName.length, 0);

  return hookDescription + '.'.repeat(numDots) + hookName;
};

Printer.prototype.printResult = function(hook, status, output, prefix) {
  prefix = prefix || '';

  switch (status) {
    case 'pass':
      if (!this.config.get('quite') && !hook.isQuiet()) {
        this.logger.success(prefix, 'OK');
      };
      return;

    case 'warn':
      this.logger.warn(prefix, 'WARNING');
      return this.printReport(output, 'warnBold');

    case 'fail':
      this.logger.error(prefix, 'FAILED');
      return this.printReport(output, 'errorBold');

    case 'interrrupt':
      this.logger.error(prefix, 'INTERRUPTED');
      return this.printReport(output, 'errorBold');

    default:
      this.logger.error(prefix, '???');
      return this.printReport(
        'Hook returned unknown status ' + status + ' -- ignoring.',
        'errorBold'
      );
  }
};

Printer.prototype.printReport = function(output, format) {
  if (output) {
    format = format || 'log';
    this.logger[format](output);
  }
};

module.exports = Printer;
