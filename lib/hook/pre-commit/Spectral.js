'use strict';
const PreCommitBase = require('./Base');

/**
 * @class Spectral
 * @extends PreCommitBase
 * @classdesc Run spectral on changed files
 */
class Spectral extends PreCommitBase {

  /**
   * Run `spectral` against files that apply.
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
          this.parseSpectralOutput(output),
          Spectral.MESSAGE_REGEX,
          Spectral.MESSAGE_CAPTURE_MAP,
          Spectral.MESSAGE_TYPE_CATEGORIZER
        ));
      }, reject);
    });
  }

// Parses the output stream of Spectral to produce an array of
// output messages. Ensures we only send valid lines to the
// standard `extractMessages` function.
  parseSpectralOutput(output) {
    let outputLines = output.split('\n');
    return outputLines.filter((outputLine) => {
      return / error | warning /.test(outputLine);
    });
  }

  static MESSAGE_TYPE_CATEGORIZER(capturedType) {
    return capturedType.toLowerCase();
  }
}

/**
 * Regex to capture various parts of Spectral text output.
 * The output lines look like this:
 * `path/to/file.js:1:1 error rule-name "Error message"`
 * @type {RegExp}
 */
Spectral.MESSAGE_REGEX = new RegExp(
  '^((?:\w:)?[^:]+):' + // 1: File name
  '(\\d+).*?' + // 2: Line number
  '(error|warning)' // 3: Type
);

/**
 * Maps the types of captured data to the index in the
 * matches array produced when executing `MESSAGE_REGEX`
 *
 * @type {{file: number, line: number, type: number}}
 */
Spectral.MESSAGE_CAPTURE_MAP = {
  'file': 1,
  'line': 2,
  'type': 3
};

module.exports = Spectral;
