'use strict';
const HookContextBase = require('./base');
const PushedRef = require('./PushedRef');

module.exports = class HookContextPrePush extends HookContextBase {
  constructor(config, argv, input) {
    super(config, argv, input);
    this.hookScriptName = 'pre-push';
    this.hookConfigName = 'PrePush';
  }

  remoteName() {
    return this.argv[0];
  }

  remoteUrl() {
    return this.argv[1];
  }

  pushedRefs() {
    return this.inputLines().map((inputLine) => {
      let pushParts = inputLine.split(' ');
      return new PushedRef(pushParts[0], pushParts[1], pushParts[2], pushParts[3]);
    });
  }
};
