'use strict';

module.exports = class Printer {
  constructor(config, logger, context) {
    this.config = config;
    this.logger = logger;
    this.context = context;
  }

  startRun() {
    if (!this.config.get('quiet')) {
      this.logger.bold('Running', this.hookScriptName(), 'hooks');
    }
  }

  nothingToRun() {
    this.logger.debug('✓ No applicable', this.hookScriptName(), 'hooks to run');
  }

  hookSkipped(hook) {
    this.logger.warn('Skipping', hook.hookName());
  }

  requiredHookNotSkipped(hook) {
    this.logger.warn('Cannot skip', hook.name, 'since it is required');
  }

  endHook(hook, status, output) {
    let endHookMsg = '';

    if ((!hook.isQuiet() && !this.config.get('quiet')) || status !== 'pass') {
      endHookMsg += this.hookHeader(hook);
    }

    this.printResult(hook, status, output, endHookMsg);
  }

  interruptTriggered() {
    this.logger.newline();
    this.logger.error('Interrupt signal received. Stopping hooks...');
  }

  runInterrupted() {
    this.logger.newline();
    this.logger.warn('⚠  Hook run interrupted by user');
    this.logger.newline();
  }

  runFailed() {
    this.logger.newline();
    this.logger.error('✗ One or more', this.hookScriptName(), 'hooks failed');
    this.logger.newline();
  }

  runWarned() {
    this.logger.newline();
    this.logger.warn('⚠ All', this.hookScriptName(), 'hooks passed, but with warnings');
    this.logger.newline();
  }

  runSucceeded() {
    if (this.config.get('quiet')) { return; }

    this.logger.newline();
    this.logger.success('✓ All', this.hookScriptName(), 'hooks passed');
    this.logger.newline();
  }

  hookScriptName() {
    return this.context.hookScriptName;
  }

  hookHeader(hook) {
    let hookName = '[' + hook.hookName() + ']';
    let hookDescription = hook.description();
    let numDots = Math.max(70 - hookDescription.length - hookName.length, 0);

    return hookDescription + '.'.repeat(numDots) + hookName;
  }

  printResult(hook, status, output, prefix) {
    prefix = prefix || '';

    switch (status) {
      case 'pass':
        if (!this.config.get('quite') && !hook.isQuiet()) {
          this.logger.success(prefix, 'OK');
        }
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
  }

  printReport(output, format) {
    if (output) {
      format = format || 'log';
      this.logger[format](output);
    }
  }
};
