var PreCommitBase = require('./Base');

function CoffeeLint(config, context) {
  PreCommitBase.prototype.constructor.apply(this, arguments);
}

Object.assign(CoffeeLint.prototype, PreCommitBase.prototype);

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
  'type': 3,
  'content': 4
};

CoffeeLint.MESSAGE_TYPE_CATEGORIZER = function(capturedType) {
  if (capturedType && capturedType.indexOf('w') > -1) {
    return 'warning';
  } else {
    return 'error';
  }
};

CoffeeLint.prototype.run = function() {
  var result = this.executeCommandOnApplicableFiles();
  var outputMessages = this.parseCoffeelintOutput(result.stdout);

  return this.extractMessages(
    outputMessages,
    CoffeeLint.MESSAGE_REGEX,
    CoffeeLint.MESSAGE_CAPTURE_MAP,
    CoffeeLint.MESSAGE_TYPE_CATEGORIZER
  );
};

// Parses the output stream of coffeelint to produce an array of
// output messages. Ensures we only send valid lines to the
// standard `extractMessages` function.
// For example, coffeelint will print the headers of the csv like:
// `path,lineNumber,lineNumberEnd,level,message`
// which is useful for a csv file, but not for our purposes.
CoffeeLint.prototype.parseCoffeelintOutput = function(stdout) {
  var outputLines = stdout.toString().trim().split("\n");
  return outputLines.filter(function(outputLine) {
    return CoffeeLint.MESSAGE_REGEX.test(outputLine);
  });

};

module.exports = CoffeeLint;



