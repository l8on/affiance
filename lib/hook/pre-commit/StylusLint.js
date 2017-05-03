'use strict';
// TODO: write tests for this hook
const HookMessage = require('../Message');
const PreCommitBase = require('./Base');

function StylusLint(_config, _context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(StylusLint.prototype, PreCommitBase.prototype);

StylusLint.prototype.run = function() {
  return new Promise((resolve, reject) => {
    let applicableFiles = this.applicableFiles();
    if (!applicableFiles.length) { return resolve('pass'); }

    let flags = this.flags();
    let command = this.command();
    let commandPromises = applicableFiles.map((currentFile) => {
      let commandArgs = flags.concat(currentFile);
      return this.spawnPromise(command, commandArgs);
    });

    // Once all commands have finished, parse output and append results
    // This is done once all commands are finished so that the output order is consistent.
    Promise.all(commandPromises).then((commandResults) => {
      let outputMessages = [];
      commandResults.forEach((result) => {
        outputMessages = outputMessages.concat(this.parseStylintResult(result));
      });
      resolve(outputMessages);
    }, reject);
  });
};

StylusLint.prototype.parseStylintResult = function(result) {
  let hookMessages = [];
  let resultHash = JSON.parse(result.stdout.toString().trim());
  let fileResult = resultHash[0];
  for (let i in fileResult.messages) {
    let currentMessage = fileResult.messages[i];
    let type = currentMessage.severity.toLowerCase();
    hookMessages.push(new HookMessage(
      type,
      fileResult.filePath,
      currentMessage.line,
      fileResult.filePath + ':' + currentMessage.line + ':' + type + ' ' + currentMessage.message
    ));
  }

  return hookMessages;
};

module.exports = StylusLint;
