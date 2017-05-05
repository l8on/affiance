'use strict';
const PreCommitBase = require('./Base');

/**
 * @class EsLint
 * @extends PreCommitBase
 * @classdesc Run eslint on changed files
 */
class EsLint extends PreCommitBase {

  /**
   * Run `eslint` against files that apply.
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
          this.parseEsLintOutput(output),
          EsLint.MESSAGE_REGEX,
          EsLint.MESSAGE_CAPTURE_MAP,
          EsLint.MESSAGE_TYPE_CATEGORIZER
        ));
      }, reject);
    });
  }

// Parses the output stream of EsLint to produce an array of
// output messages. Ensures we only send valid lines to the
// standard `extractMessages` function.
// For example, EsLint will print the headers of the csv like:
// `path,lineNumber,lineNumberEnd,level,message`
// which is useful for a csv file, but not for our purposes.
  parseEsLintOutput(output) {
    let outputLines = output.split('\n');
    return outputLines.filter((outputLine) => {
      return /Error|Warning/.test(outputLine);
    });
  }

  static MESSAGE_TYPE_CATEGORIZER(capturedType) {
    return capturedType.toLowerCase();
  }
}

/**
 * Regex to capture various parts of EsLint csv output.
 * The output lines look like this:
 * `path/to/file.js: line 1, col 0, Error - Error message (ruleName)`
 * @type {RegExp}
 */
EsLint.MESSAGE_REGEX = new RegExp(
  '^((?:\w:)?[^:]+):[^\\d]+' + // 1: File name
  '(\\d+).*?' + // 2: Line number
  '(Error|Warning)' // 3: Type
);

/**
 * Maps the types of captured data to the index in the
 * matches array produced when executing `MESSAGE_REGEX`
 *
 * @type {{file: number, line: number, type: number}}
 */
EsLint.MESSAGE_CAPTURE_MAP = {
  'file': 1,
  'line': 2,
  'type': 3
};

module.exports = EsLint;
