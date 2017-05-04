/**
 * A HookMessage affords more detailed reporting of hook runs than the
 * simpler string and array results. Hooks can return an array of
 * HookMessage instances for more detailed reporting.
 * A `HookMessage` instance holds meta data related to each reported
 * issue from the the hook's run including the file path and line number.
 */
class HookMessage {
  /**
   * Construct a HookMessage
   *
   * @param {string} type - one of the MESSAGE_TYPES
   * @param {string} file - the absolute path the the offending file
   * @param {number} line - the line number of the incident
   * @param {string} content - the content of the incident description
   */
  constructor(type, file, line, content) {
    this.type = type;
    this.file = file;
    this.line = line;
    this.content = content;
  }

  /**
   * Returns true if the hook message is an error.
   *
   * @returns {boolean}
   */
  isError() {
    return (this.type === 'error');
  }

  /**
   * Returns true if the hook message is a warning.
   *
   * @returns {boolean}
   */
  isWarning() {
    return (this.type === 'warning');
  }
}

HookMessage.MESSAGE_TYPES = [
  'error',
  'warning'
];

module.exports = HookMessage;
