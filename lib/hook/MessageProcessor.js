'use strict';
const ERRORS_MODIFIED_HEADER = 'Errors on modified lines:';
const WARNINGS_MODIFIED_HEADER = 'Warnings on modified lines:';
const ERRORS_UNMODIFIED_HEADER = "Errors on lines you didn't modify:";
const WARNINGS_UNMODIFIED_HEADER = "Warnings on lines you didn't modify:";
const ERRORS_GENERIC_HEADER = 'Errors:';
const WARNINGS_GENERIC_HEADER = 'Warnings:';

class HookMessageProcessor {
  constructor(hook, unmodifiedLinesSetting) {
    this.hook = hook;
    this.unmodifiedLinesSetting = unmodifiedLinesSetting;
  }

  hookResult(messages) {
    let runResult = this.basicStatusAndOutput(messages);

    // Nothing special to do if everything passed.
    if (runResult.status === 'pass') { return runResult; }

    // Return result as is if there is no concept of modified lines
    if (typeof this.hook.context.modifiedLinesInFile !== 'function') { return runResult; }

    return this.handleModifiedLines(messages, runResult.status);
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

  handleModifiedLines(messages, status) {
    let result = {
      output: '',
      status: status
    };
    let genericMessages = [];
    let messagesWithLine = [];
    let messagesOnModifiedLines = [];
    let messagesOnUnmodifiedLines = [];

    messages = this.removeIgnoredMessages(messages);

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

    result.status = this.transformStatus(status, genericMessages.concat(messagesOnModifiedLines));
    return result;
  }

  transformStatus(status, messagesOnModifiedLines) {
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
    return (status === 'warn' && this.unmodifiedLinesSetting === 'ignore' && !warningMessages.length);
  }

  removeIgnoredMessages(messages) {
    if(this.unmodifiedLinesSetting !== 'ignore') { return messages; }

    return messages.filter((message) => {
      return this.isMessageOnModifiedLine(message);
    });
  }

  isMessageOnModifiedLine(message) {
    // Message without line number assumed to apply to entire file
    if (!message.line) { return true; }

    let modifiedLinesInFile = this.hook.context.modifiedLinesInFile(message.file);
    return (modifiedLinesInFile.indexOf('' + message.line) > -1);
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
