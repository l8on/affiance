var PreCommitBase = require('./Base');

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

EsLint.MESSAGE_TYPE_CATEGORIZER = function(capturedType) {
  return capturedType.toLowerCase();
};

EsLint.prototype.run = function() {
  var result = this.executeCommandOnApplicableFiles();
  var output = result.stdout.toString().trim();
  if (result.status === 0 && !output) { return 'pass'; }

  var outputMessages = this.parseEsLintOutput(output);

  return this.extractMessages(
    outputMessages,
    EsLint.MESSAGE_REGEX,
    EsLint.MESSAGE_CAPTURE_MAP,
    EsLint.MESSAGE_TYPE_CATEGORIZER
  );
};

// Parses the output stream of EsLint to produce an array of
// output messages. Ensures we only send valid lines to the
// standard `extractMessages` function.
// For example, EsLint will print the headers of the csv like:
// `path,lineNumber,lineNumberEnd,level,message`
// which is useful for a csv file, but not for our purposes.
EsLint.prototype.parseEsLintOutput = function(output) {
  var outputLines = output.split("\n");
  return outputLines.filter(function(outputLine) {
    return /Error|Warning/.test(outputLine);
  });
};

module.exports = EsLint;
