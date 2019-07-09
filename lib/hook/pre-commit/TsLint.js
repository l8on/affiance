'use strict';
const PreCommitBase = require('./Base');

/**
 * @class TsLint
 * @extends PreCommitBase
 * @classdesc Run tslint on changed files
 */
class TsLint extends PreCommitBase {

  /**
   * Run `tslint` against files that apply.
   * Uses spawnPromiseOnApplicableFiles to parallelize
   *
   * @returns {Promise}
   * @resolves {HookMessage[]} An array of hook messages produced by the hook
   * @rejects {Error} An Error thrown or emitted while running the hook
   */
  run() {
    return new Promise((resolve, reject) => {
      this.spawnPromiseOnApplicableFiles().then((result) => {
        let output = result.stdout.trim();
        if (result.status === 0 && !output) { return resolve('pass'); }

        resolve(this.extractMessages(
          this.parseTsLintOutput(output),
          TsLint.MESSAGE_REGEX,
          TsLint.MESSAGE_CAPTURE_MAP,
          TsLint.MESSAGE_TYPE_CATEGORIZER
        ));
      }, reject);
    });
  }

  // Parses the output stream of TsLint to produce an array of
  // output messages. Ensures we only send valid lines to the
  // standard `extractMessages` function.
  // For example, TsLint will print a warning if some rules aren't well defined like:
  // `Warning: The 'deprecation' rule requires type information.`
  // which is useful information, but not for our purposes.
  parseTsLintOutput(output) {
    let outputLines = output.split('\n');
    return outputLines.filter((outputLine) => {
      return /ERROR|WARNING/.test(outputLine);
    });
  }

  static MESSAGE_TYPE_CATEGORIZER(capturedType) {
    return capturedType.toLowerCase();
  }
}

/**
 * Regex to capture various parts of TsLint "prose" output.
 * The output lines look like this:
 * ERROR: relative/path.ts:L:C - Rule name
 *
 * @type {RegExp}
 */
TsLint.MESSAGE_REGEX = new RegExp(
  '^(ERROR|WARNING):\\s+' + // 1: Type
  '([^:]+):' + // 2: File name
  '(\\d+):.*$' // 3: Line number
);

/**
 * Maps the types of captured data to the index in the
 * matches array produced when executing `MESSAGE_REGEX`
 *
 * @type {{file: number, line: number, type: number}}
 */
TsLint.MESSAGE_CAPTURE_MAP = {
  'type': 1,
  'file': 2,
  'line': 3
};

module.exports = TsLint;
