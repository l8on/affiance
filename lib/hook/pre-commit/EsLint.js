"use strict";
let PreCommitBase = require('./Base');

function EsLint(config, context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(EsLint.prototype, PreCommitBase.prototype);

// Regex to capture various parts of EsLint csv output.
// The output lines look like this:
// `path/to/file.js: line 1, col 0, Error - Error message (ruleName)`
EsLint.MESSAGE_REGEX = new RegExp(
  '^((?:\w:)?[^:]+):[^\\d]+' + // 1: File name
  '(\\d+).*?' + // 2: Line number
  '(Error|Warning)' // 3: Type
);

EsLint.MESSAGE_CAPTURE_MAP = {
  'file': 1,
  'line': 2,
  'type': 3
};

EsLint.MESSAGE_TYPE_CATEGORIZER = (capturedType) => {
  return capturedType.toLowerCase();
};

EsLint.prototype.run = function() {
  return new Promise((resolve, reject) => {
    this.spawnConcurrentCommandsOnApplicableFiles().then((result) => {
      let output = result.stdout.trim();
      if (result.status === 0 && !output) { return resolve('pass'); }

      resolve(this.extractMessages(
        this.parseEsLintOutput(output),
        EsLint.MESSAGE_REGEX,
        EsLint.MESSAGE_CAPTURE_MAP,
        EsLint.MESSAGE_TYPE_CATEGORIZER
      ));
    }, reject);
  });
};

// Parses the output stream of EsLint to produce an array of
// output messages. Ensures we only send valid lines to the
// standard `extractMessages` function.
// For example, EsLint will print the headers of the csv like:
// `path,lineNumber,lineNumberEnd,level,message`
// which is useful for a csv file, but not for our purposes.
EsLint.prototype.parseEsLintOutput = function(output) {
  let outputLines = output.split("\n");
  return outputLines.filter((outputLine) => {
    return /Error|Warning/.test(outputLine);
  });
};

module.exports = EsLint;
