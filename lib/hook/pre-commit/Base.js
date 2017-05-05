'use strict';
const _ = require('lodash');
const HookBase = require('../Base');
const HookMessage = require('../Message');
const AffianceError = require('../../error');

/**
 * @class PreCommitBase
 * @extends HookBase
 * @classdesc Base hook for all pre-commit hooks
 */
class PreCommitBase extends HookBase {
  /**
   * @typedef CaptureMap
   * @property {number} file - the index of the capture group
   *   with the file name
   * @property {number} line - the index of the capture group
   *   with the line number
   * @property {type} type - the index of the capture group
   *   with the type string
   */

  /**
   * Extract file, line number, and type of message from a list of
   * error and/or warning messages from the output of a pre-commit hook.
   *
   * Assumes each element of `outputMessages` is a separate error/warning
   * with all the information needed to identify it.
   *
   * @param {string[]} outputMessages - unprocessed output messages
   * @param {RegExp} regex - a regular expression that will capture the `file`
   *   `line`, and `type` from each message.
   * @param {CapturMap} captureMap - the map of capture group label to
   *   index in the matches array
   * @param {function} typeCategorizer - A function to run against the
   *   captured type
   * @returns {HookMessage[]} an array of hook messages build from the
   *   extracted file, line, type and content
   */
  extractMessages(outputMessages, regex, captureMap, typeCategorizer) {
    if (!outputMessages || !outputMessages.length) { return []; }

    return outputMessages.map((outputMessage, index) => {
      // Reset lastIndex in case this is a global regex
      regex.lastIndex = 0;
      let matchResult = regex.exec(outputMessage);
      if(!matchResult) {
        throw new AffianceError.error(
          AffianceError.MessageProcessingError,
          'Unexpected output: unable to determine line number or type ' +
          'of error or warning for output:\n' +
          outputMessages.slice(index, -1).join('\n')
        );
      }

      let file = this.extractFile(matchResult, captureMap, outputMessage);
      let line = this.extractLine(matchResult, captureMap, outputMessage);
      let type = this.extractType(matchResult, captureMap, outputMessage, typeCategorizer);
      let content = this.extractContent(matchResult, captureMap, outputMessage);

      return new HookMessage(type, file, line, content);
    });
  }

  /**
   * Extract the file path from the matches array
   *
   * @param {Array} matchResult - the reseult of the RegExp#exec call
   * @param {CaptureMap} captureMap - the capture map to use to use on the matches array
   * @param {string} outputMessage - the ouput message in it's entirety
   * @returns {string}
   */
  extractFile(matchResult, captureMap, outputMessage) {
    let capturedFile = matchResult[captureMap.file];
    if (_.isNil(capturedFile)) { return; }

    if (capturedFile === '') {
      throw new AffianceError.error(
        AffianceError.MessageProcessingError,
        `Unexpected output: no file found in ${outputMessage}`
      );
    }

    return capturedFile;
  }

  /**
   * Extract the line number from the matches array
   *
   * @param {Array} matchResult - the reseult of the RegExp#exec call
   * @param {CaptureMap} captureMap - the capture map to use to use on the matches array
   * @param {string} outputMessage - the ouput message in it's entirety
   * @returns {number}
   */
  extractLine(matchResult, captureMap, outputMessage) {
    let capturedLine = matchResult[captureMap.line];
    if (_.isNil(capturedLine)) { return; }

    let lineNumber = parseInt(capturedLine, 10);

    if (_.isNaN(lineNumber)) {
      throw new AffianceError.error(
        AffianceError.MessageProcessingError,
        'Unexpected output: invalid line number found in ' + outputMessage
      );
    }
    return lineNumber;
  }

  /**
   * Extract the line number from the matches array
   *
   * @param {Array} matchResult - the reseult of the RegExp#exec call
   * @param {CaptureMap} captureMap - the capture map to use to use on the matches array
   * @param {string} outputMessage - the ouput message in it's entirety
   * @returns {number}
   */
  extractType(matchResult, captureMap, outputMessage, typeCategorizer) {
    if (!typeCategorizer) {
      // Assume the message is an error if there is no categorizer
      return 'error';
    }

    let capturedType = matchResult[captureMap.type] || null;
    let type = typeCategorizer(capturedType);
    if (HookMessage.MESSAGE_TYPES.indexOf(type) < 0) {
      throw new AffianceError.error(
        AffianceError.MessageProcessingError,
        ['Invalid message type', type, 'for', outputMessage + ':',
          'must be one of', HookMessage.MESSAGE_TYPES.join(', ')
        ].join(' ')
      );
    }

    return type;
  }

  /**
   * Extract the content from the outputMessage
   *
   * @param {Array} matchResult - the reseult of the RegExp#exec call
   * @param {CaptureMap} captureMap - the capture map to use to use on the matches array
   * @param {string} outputMessage - the ouput message in it's entirety
   * @returns {number}
   */
  extractContent(matchResult, captureMap, outputMessage) {
    if (_.isNil(captureMap.content)) { return outputMessage; }

    let capturedContent = matchResult[captureMap.content];
    if (capturedContent.trim()) { return capturedContent.trim(); }

    return outputMessage;
  }
}

const CONTEXT_DELEGATIONS = [
  'isAmendment',
  'isInitialCommit',
  'modifiedLinesInFile'
];
HookBase.delegateToContext(PreCommitBase, CONTEXT_DELEGATIONS);

module.exports = PreCommitBase;
