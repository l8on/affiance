'use strict';
const CommitMsgBase = require('./Base');

/**
 * @class CapitalizedSubject
 * @extends CommitMsgBase
 * @classdesc Check commit message for a capitalized subject
 */
module.exports = class CapitalizedSubject extends CommitMsgBase {
  run() {
    if (this.isEmptyMessage()) { return 'pass'; }

    let subject = this.commitMessageLines().find(function(commitMessageLine) {
      return (commitMessageLine.trim() !== '');
    });

    let firstLetter = subject.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()"']/, '')[0];
    if (!this.hasSpecialPrefix(subject) && firstLetter !== firstLetter.toUpperCase()) {
      return ['warn', 'Subject should start with a capital letter'];
    }

    return 'pass';
  }

  hasSpecialPrefix(subject) {
    return !!(subject && subject.match(/^(fixup|squash)!/));
  }
};
