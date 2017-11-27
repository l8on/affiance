'use strict';
const ERRORS_MODIFIED_HEADER = 'Errors on modified lines:';
const WARNINGS_MODIFIED_HEADER = 'Warnings on modified lines:';
const ERRORS_UNMODIFIED_HEADER = "Errors on lines you didn't modify:";
const WARNINGS_UNMODIFIED_HEADER = "Warnings on lines you didn't modify:";
const ERRORS_GENERIC_HEADER = 'Errors:';
const WARNINGS_GENERIC_HEADER = 'Warnings:';

class HookMessageProcessor {
  /**
   *
   * @param {HookBase} hook - the hook to process messages for
   * @param {String} unmodifiedLinesSetting - the "problemOnUnmodifiedLines" setting for this hook
   * @param {String} ignoreMessagePatternSetting - the "ignoreMessagePattern" setting for this hook.
   */
  constructor(hook, unmodifiedLinesSetting, ignoreMessagePatternSetting) {
    this.hook = hook;
    this.unmodifiedLinesSetting = unmodifiedLinesSetting;
    this.ignoreMessagePattern = ignoreMessagePatternSetting ? RegExp(ignoreMessagePatternSetting) : null;
  }

  hookResult(messages) {
    // Remove any messages we are configured to ignore
    messages = this.removeIgnoredMessages(messages);

    // Gather a basic run result from the unfiltered messages.
    let runResult = this.basicStatusAndOutput(messages);

    // Nothing special to do if everything passed.
    if (runResult.status === 'pass') { return runResult; }

    // Return result as is if there is no concept of modified lines
    if (!this.canFilterMessages()) { return runResult; }

    // Filter the status and output based on the settings for the hook
    return this.filterMessagesAndUpdateStatus(messages, runResult.status);
  }

  basicStatusAndOutput(messages) {
    let result = {
      status: null,
      output: ''
    };

    messages.forEach((message) => {
      if(message.isError()) {
        result.status = 'fail';
      } else if(result.status !== 'fail' && message.isWarning()) {
        result.status = 'warn';
      }

      if(message.content) {
        result.output += message.content + '\n';
      }
    });

    if (!result.status) {
      result.status = 'pass';
    }
    return result;
  }

  hasMessageFiltering() {
    return !!(this.ignoreMessagePattern || this.unmodifiedLinesSetting === 'ignore');
  }

  canFilterMessages() {
    return !!(
      this.ignoreMessagePattern ||
      typeof this.hook.context.modifiedLinesInFile === 'function'
    );
  }

  filterMessagesAndUpdateStatus(messages, status) {
    let result = {
      output: '',
      status: status
    };
    let genericMessages = [];
    let messagesWithLine = [];
    let messagesOnModifiedLines = [];
    let messagesOnUnmodifiedLines = [];

    messages.forEach((message) => {
      if(message.line) {
        messagesWithLine.push(message);
      } else {
        genericMessages.push(message);
      }
    });

    result.output = this.outputMessages(genericMessages, ERRORS_GENERIC_HEADER, WARNINGS_GENERIC_HEADER);

    messagesWithLine.forEach((message) => {
      if(this.isMessageOnModifiedLine(message)) {
        messagesOnModifiedLines.push(message);
      } else {
        messagesOnUnmodifiedLines.push(message);
      }
    });

    result.output += this.outputMessages(messagesOnModifiedLines, ERRORS_MODIFIED_HEADER, WARNINGS_MODIFIED_HEADER);
    result.output += this.outputMessages(messagesOnUnmodifiedLines, ERRORS_UNMODIFIED_HEADER, WARNINGS_UNMODIFIED_HEADER);

    result.status = this.transformModifiedLineStatus(status, genericMessages.concat(messagesOnModifiedLines));
    return result;
  }

  transformModifiedLineStatus(status, messagesOnModifiedLines) {
    // `report` indicates user wants the original status
    if (this.unmodifiedLinesSetting === 'report') { return status; }

    let errorMessages = [];
    let warningMessages = [];
    messagesOnModifiedLines.forEach((message) => {
      if (message.isError()) { return errorMessages.push(message); }
      if (message.isWarning()) { return warningMessages.push(message); }
    });

    if (this.canUpgradeToWarning(status, errorMessages)) {
      status = 'warn';
    }

    if (this.canUpgradeToPassing(status, warningMessages)) {
      status = 'pass';
    }

    return status;
  }

  canUpgradeToWarning(status, errorMessages) {
    return (status === 'fail' && !errorMessages.length);
  }

  canUpgradeToPassing(status, warningMessages) {
    return (
      status === 'warn' &&
      this.unmodifiedLinesSetting === 'ignore' &&
      !warningMessages.length
    );
  }

  removeIgnoredMessages(messages) {
    if(!this.hasMessageFiltering()) { return messages; }

    return messages.filter((message) => {
      // If we are meant to ignore unmodified lines, return false if this message is about
      // an unmodified line.
      if (this.unmodifiedLinesSetting === 'ignore' && !this.isMessageOnModifiedLine(message)) {
        return false;
      }

      // Return false if the message matches a configured ignore pattern
      if (this.matchesIgnorePattern(message)) {
        return false;
      }

      // Unless actively ignored, return true to include the message.
      return true;
    });
  }

  isMessageOnModifiedLine(message) {
    // Message without line number assumed to apply to entire file
    if (!message.line) { return true; }

    let modifiedLinesInFile = this.hook.context.modifiedLinesInFile(message.file);
    return (modifiedLinesInFile.indexOf('' + message.line) > -1);
  }

  matchesIgnorePattern(message) {
    if (!this.ignoreMessagePattern) { return false; }
    return this.ignoreMessagePattern.test(message.content || '');
  }

  outputMessages(messages, errorHeading, warningHeading) {
    let output = '';
    let errors = [];
    let warnings = [];

    messages.forEach((message) => {
      if (message.isError()) {
        errors.push(message.content);
      }
      if (message.isWarning()) {
        warnings.push(message.content);
      }
    });

    if (errors.length) {
      output += `${errorHeading}\n${errors.join('\n')}\n`;
    }

    if (warnings.length) {
      output += `${warningHeading}\n${warnings.join('\n')}\n`;
    }

    return output;
  }
}

HookMessageProcessor.ERRORS_MODIFIED_HEADER = ERRORS_MODIFIED_HEADER;
HookMessageProcessor.WARNINGS_MODIFIED_HEADER = WARNINGS_MODIFIED_HEADER;
HookMessageProcessor.ERRORS_UNMODIFIED_HEADER = ERRORS_UNMODIFIED_HEADER;
HookMessageProcessor.WARNINGS_UNMODIFIED_HEADER = WARNINGS_UNMODIFIED_HEADER;
HookMessageProcessor.ERRORS_GENERIC_HEADER = ERRORS_GENERIC_HEADER;
HookMessageProcessor.WARNINGS_GENERIC_HEADER = WARNINGS_GENERIC_HEADER;

module.exports = HookMessageProcessor;
