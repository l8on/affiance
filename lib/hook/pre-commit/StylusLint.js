'use strict';
// TODO: write tests for this hook
const HookMessage = require('../Message');
const PreCommitBase = require('./Base');

module.exports = class StylusLint extends PreCommitBase {

  /**
   * Run `stylint` against files that apply.
   * Uses `#spawnPromise` directly because stylint can only
   * run against single files or specific directories.
   *
   * @returns {Promise}
   * @resolves {HookMessage[]} An array of hook messages produced by the hook
   * @rejects {Error} An Error thrown or emitted while running the hook
   */
  run() {
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
        let reachedError = false;
        commandResults.forEach((result) => {
          // If we've already had an error, don't try to run again
          if (reachedError) { return; }

          // The process can't be started.
          if (result.error) {
            reachedError = true;
            let resultErrorOutput = result.stderr ? result.stderr : (result.error.message || result.error.toString());
            return resolve(['fail', command + ' encountered an error\n' + resultErrorOutput]);
          }

          outputMessages = outputMessages.concat(this.parseStylintResult(result));
        });

        resolve(outputMessages);
      }, reject);
    });
  }

  /**
   * Parse a stylint result to generate an array of
   * HookMessage objects. the reporter we use produces a json object like:
   * {
   *   severity: 'error'|'warning',
   *   message: 'error or warning message',
   *   rule: 'rule-name',
   *   line: 15,
   *   column: 16
   * }
   *
   * @param {SpawnResult} result - the result of the stylint run
   * @returns {HookMessage[]}
   */
  parseStylintResult(result) {
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
  }
};
