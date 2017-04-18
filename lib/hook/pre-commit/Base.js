var _ = require('lodash');
var HookBase = require('../Base');
var HookMessage = require('../Message');
var AffianceError = require('../../error');

function PreCommitBase(config, context) {
  HookBase.prototype.constructor.apply(this, arguments);
}

Object.assign(PreCommitBase.prototype, HookBase.prototype);

var CONTEXT_DELEGATIONS = [
  'isAmendment',
  'isInitialCommit',
  'modifiedLinesInFile'
];
HookBase.delegateToContext(PreCommitBase, CONTEXT_DELEGATIONS);

// Extract file, line number, and type of message from a list of
// error and/or warning messages from the output of a pre-commit hook.
//
// Assumes each element of `outputMessages` is a separate error/warning
// with all the information needed to identify it.
//
// @param outputMessages [Array<String>] unprocessed output messages
// @param regex [RegExp] a regular expression that will capture the `file`
//   `line`, and `type` from each message.
// @param captureMap [Object] an object that maps the capture group
//   indexes to what it represents to work around javascripts lack of
//   named capture groups
// @option captureMap.file [Number] the index of the capture group
//   with the file name
// @option captureMap.line [Number] the index of the capture group
//   with the line number
// @option captureMap.type [Number] the index of the capture group
//   with the type number
// @param typeCategorizer [Function] a function to run against the
//   captured type to produce a standard type string ('error', 'warning')
//   If not provided, all messages will be considered errors
PreCommitBase.prototype.extractMessages = function(outputMessages, regex, captureMap, typeCategorizer) {
  if (!outputMessages || !outputMessages.length) { return []; }

  var self = this;
  return outputMessages.map(function(outputMessage, index) {
    // Reset lastIndex in case this is a global regex
    regex.lastIndex = 0;
    var matchResult = regex.exec(outputMessage);
    if(!matchResult) {
      throw new AffianceError.error(
        AffianceError.MessageProcessingError,
        'Unexpected output: unable to determine line number or type ' +
        'of error or warning for output:\n' +
        outputMessages.slice(index, -1).join("\n")
      );
    }

    var file = self.extractFile(matchResult, captureMap, outputMessage);
    var line = self.extractLine(matchResult, captureMap, outputMessage);
    var type = self.extractType(matchResult, captureMap, outputMessage, typeCategorizer);
    var content = self.extractContent(matchResult, captureMap, outputMessage);

    return new HookMessage(type, file, line, content || outputMessage);
  });
};

PreCommitBase.prototype.extractFile = function(matchResult, captureMap, outputMessage) {
  var capturedFile = matchResult[captureMap.file];
  if (_.isNil(capturedFile)) { return; }

  if (capturedFile === '') {
    throw new AffianceError.error(
      AffianceError.MessageProcessingError,
      'Unexpected output: no file found in ' + outputMessage
    );
  }

  return capturedFile
};

PreCommitBase.prototype.extractLine = function(matchResult, captureMap, outputMessage) {
  var capturedLine = matchResult[captureMap.line];
  if (_.isNil(capturedLine)) { return; }

  var lineNumber = parseInt(capturedLine, 10);

  if (_.isNaN(lineNumber)) {
    throw new AffianceError.error(
      AffianceError.MessageProcessingError,
      'Unexpected output: invalid line number found in ' + outputMessage
    );
  }
  return lineNumber
};

PreCommitBase.prototype.extractType = function(matchResult, captureMap, outputMessage, typeCategorizer) {
  if (!typeCategorizer) {
    // Assume the message is an error if there is no categorizer
    return 'error'
  }

  var capturedType = matchResult[captureMap.type] || null;
  var type = typeCategorizer(capturedType);
  if (HookMessage.MESSAGE_TYPES.indexOf(type) < 0) {
    throw new AffianceError.error(
      AffianceError.MessageProcessingError,
      ['Invalid message type', type, 'for', outputMessage + ':',
        'must be one of', HookMessage.MESSAGE_TYPES.join(', ')
      ].join(' ')
    );
  }

  return type;
};

PreCommitBase.prototype.extractContent = function(matchResult, captureMap, outputMessage) {
  if (_.isNil(captureMap.content)) { return; }

  var capturedContent = matchResult[captureMap.content];
  if (_.isNil(capturedContent)) { return; }

  return capturedContent.trim();
};

module.exports = PreCommitBase;
