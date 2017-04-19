var HookMessage = require('../Message');
var PreCommitBase = require('./Base');

function StylusLint(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(StylusLint.prototype, PreCommitBase.prototype);

StylusLint.prototype.run = function() {
  var applicableFiles = this.applicableFiles();
  if (!applicableFiles.length) { return 'pass'; }

  var outputMessages = [];
  var flags = this.flags();
  for (var i in applicableFiles) {
    var currentFile = applicableFiles[i];
    var commandArgs = flags.concat(currentFile);
    var result = this.execute(this.command(), commandArgs);
    outputMessages = outputMessages.concat(this.parseStylintResult(result));
  }

  return outputMessages;
};

StylusLint.prototype.parseStylintResult = function(result) {
  var hookMessages = [];
  var resultHash = JSON.parse(result.stdout.toString().trim());
  var fileResult = resultHash[0];
  for (var i in fileResult.messages) {
    var currentMessage = fileResult.messages[i];
    var type = currentMessage.severity.toLowerCase();
    hookMessages.push(new HookMessage(
      type,
      resultHash.filePath,
      currentMessage.line,
      resultHash.filePath + ':' + currentMessage.line + ':' + type + ' ' + currentMessage.message
    ));
  }

  return hookMessages;
};

module.exports = StylusLint;
