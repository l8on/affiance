var CommitMsgBase = require('./Base');

function CapitalizedSubject(config, context) {
  CommitMsgBase.prototype.constructor.apply(this, arguments);
}

Object.assign(CapitalizedSubject.prototype, CommitMsgBase.prototype);

CapitalizedSubject.prototype.run = function() {
  if (this.isEmptyMessage()) { return 'pass'; }

  var subject = this.commitMessageLines().find(function(commitMessageLine) {
    return (commitMessageLine.trim() !== '');
  });

  var firstLetter = subject[0];
  if (!this.hasSpecialPrefix(subject) && firstLetter !== firstLetter.toUpperCase()) {
    return ['warn', 'Subject should start with a capital letter'];
  }

  return 'pass';
};

CapitalizedSubject.prototype.hasSpecialPrefix = function(subject) {
  return !!(subject && subject.match(/^(fixup|squash)!/));
};

module.exports = CapitalizedSubject;
