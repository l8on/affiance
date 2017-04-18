var ERRORS_MODIFIED_HEADER = 'Errors on modified lines:';
var WARNINGS_MODIFIED_HEADER = 'Warnings on modified lines:';
var ERRORS_UNMODIFIED_HEADER = "Errors on lines you didn't modify:";
var WARNINGS_UNMODIFIED_HEADER = "Warnings on lines you didn't modify:";
var ERRORS_GENERIC_HEADER = 'Errors:';
var WARNINGS_GENERIC_HEADER = 'Warnings:';

function HookMessageProcessor(hook, unmodifiedLinesSetting) {
  this.hook = hook;
  this.unmodifiedLinesSetting = unmodifiedLinesSetting;
}

HookMessageProcessor.ERRORS_MODIFIED_HEADER = ERRORS_MODIFIED_HEADER;
HookMessageProcessor.WARNINGS_MODIFIED_HEADER = WARNINGS_MODIFIED_HEADER;
HookMessageProcessor.ERRORS_UNMODIFIED_HEADER = ERRORS_UNMODIFIED_HEADER;
HookMessageProcessor.WARNINGS_UNMODIFIED_HEADER = WARNINGS_UNMODIFIED_HEADER;
HookMessageProcessor.ERRORS_GENERIC_HEADER = ERRORS_GENERIC_HEADER;
HookMessageProcessor.WARNINGS_GENERIC_HEADER = WARNINGS_GENERIC_HEADER;

HookMessageProcessor.prototype.hookResult = function(messages) {
  var runResult = this.basicStatusAndOutput(messages);

  // Nothing special to do if everything passed.
  if (runResult.status == 'pass') { return runResult; }

  // Return result as is if there is no concept of modified lines
  if (typeof this.hook.context.modifiedLinesInFile !== 'function') { return runResult; }

  return this.handleModifiedLines(messages, runResult.status);
};

HookMessageProcessor.prototype.basicStatusAndOutput = function(messages) {
  var result = {
    status: null,
    output: ''
  };

  messages.forEach(function(message) {
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
};

HookMessageProcessor.prototype.handleModifiedLines = function(messages, status) {
  var result = {
    output: '',
    status: status
  };
  var genericMessages = [];
  var messagesWithLine = [];
  var messagesOnModifiedLines = [];
  var messagesOnUnmodifiedLines = [];
  var self = this;

  messages = this.removeIgnoredMessages(messages);

  messages.forEach(function(message) {
    if(message.line) {
      messagesWithLine.push(message);
    } else {
      genericMessages.push(message);
    }
  });

  result.output = this.outputMessages(genericMessages, ERRORS_GENERIC_HEADER, WARNINGS_GENERIC_HEADER);

  messagesWithLine.forEach(function(message) {
    if(self.isMessageOnModifiedLine(message)) {
      messagesOnModifiedLines.push(message);
    } else {
      messagesOnUnmodifiedLines.push(message);
    }
  });

  result.output += this.outputMessages(messagesOnModifiedLines, ERRORS_MODIFIED_HEADER, WARNINGS_MODIFIED_HEADER);
  result.output += this.outputMessages(messagesOnUnmodifiedLines, ERRORS_UNMODIFIED_HEADER, WARNINGS_UNMODIFIED_HEADER);

  result.status = this.transformStatus(status, genericMessages.concat(messagesOnModifiedLines));
  return result;
};

HookMessageProcessor.prototype.transformStatus = function(status, messagesOnModifiedLines) {
  // `report` indicates user wants the original status
  if (this.unmodifiedLinesSetting === 'report') { return status; }

  var errorMessages = [];
  var warningMessages = [];
  messagesOnModifiedLines.forEach(function(message) {
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
};

HookMessageProcessor.prototype.canUpgradeToWarning = function(status, errorMessages) {
  return (status === 'fail' && !errorMessages.length);
};

HookMessageProcessor.prototype.canUpgradeToPassing = function(status, warningMessages) {
  return (status === 'warn' && this.unmodifiedLinesSetting === 'ignore' && !warningMessages.length);
};

HookMessageProcessor.prototype.removeIgnoredMessages = function(messages) {
  if(this.unmodifiedLinesSetting !== 'ignore') { return messages; }

  var self = this;
  return messages.filter(function(message) {
    return self.isMessageOnModifiedLine(message);
  });
};

HookMessageProcessor.prototype.isMessageOnModifiedLine = function(message) {
  // Message without line number assumed to apply to entire file
  if (!message.line) { return true; }

  var modifiedLinesInFile = this.hook.context.modifiedLinesInFile(message.file);
  return (modifiedLinesInFile.indexOf('' + message.line) > -1);
};

HookMessageProcessor.prototype.outputMessages = function(messages, errorHeading, warningHeading) {
  var output = '';
  var errors = [];
  var warnings = [];

  messages.forEach(function(message) {
    if (message.isError()) {
      errors.push(message.content);
    }
    if (message.isWarning()) {
      warnings.push(message.content);
    }
  });

  if (errors.length) {
    output += errorHeading + "\n" + errors.join("\n") + "\n";
  }

  if (warnings.length) {
    output += warningHeading + "\n" + warnings.join("\n") + "\n";
  }

  return output;
};

module.exports = HookMessageProcessor;
