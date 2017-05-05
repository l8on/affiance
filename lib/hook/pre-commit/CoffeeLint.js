'use strict';
const PreCommitBase = require('./Base');

class CoffeeLint extends PreCommitBase {
  /**
   * Run `coffeelint` against files that apply.
   * Uses
   * @returns {Promise}
   */
  run() {
    return new Promise((resolve, reject) => {
      this.spawnPromiseOnApplicableFiles().then((result) => {
        if(result.stderr.toString()) {
          return resolve(['fail', 'coffeelint has error output:\n' + result.stderr.toString()]);
        }

        return resolve(this.extractMessages(
          this.parseCoffeelintOutput(result.stdout),
          CoffeeLint.MESSAGE_REGEX,
          CoffeeLint.MESSAGE_CAPTURE_MAP,
          CoffeeLint.MESSAGE_TYPE_CATEGORIZER
        ));
      }, reject);
    });
  }

  /**
   * Parses the output stream of coffeelint to produce an array of
   * output messages. Ensures we only send valid lines to the
   * standard `extractMessages` function.
   * For example, coffeelint will print the headers of the csv like:
   *   path,lineNumber,lineNumberEnd,level,message
   * which is useful for a csv file, but not for our purposes.
   *
   * @param {Buffer|string} stdout - the stdout content of a `coffeelint` run
   * @returns {string[]}
   */
  parseCoffeelintOutput(stdout) {
    let outputLines = stdout.toString().trim().split('\n');
    return outputLines.filter((outputLine) => {
      return CoffeeLint.MESSAGE_REGEX.test(outputLine);
    });
  }

  static MESSAGE_TYPE_CATEGORIZER(capturedType) {
    if (capturedType && capturedType.indexOf('w') > -1) {
      return 'warning';
    } else {
      return 'error';
    }
  }
}

// Regex to capture various parts of coffeelint csv output.
// The output lines look like this:
// `dir/path.coffee,10,20,warn,Some Issue Described`
CoffeeLint.MESSAGE_REGEX = new RegExp(
  '^(.+),' + //1: File name
  '(\\d*),\\d*,' + //2: Line number
  '(\\w+),' + //3: Type
  '(.+)$' //4: Content
);

CoffeeLint.MESSAGE_CAPTURE_MAP = {
  'file': 1,
  'line': 2,
  'type': 3
};

module.exports = CoffeeLint;



