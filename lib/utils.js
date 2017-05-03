'use strict';
const _ = require('lodash');
const childProcess = require('child_process');
const classify = require('underscore.string/classify');
const os = require('os');
const path = require('path');
const fileUtils = require('./fileUtils');
const repoRoot = require('./repoRoot');

const SUPPORTED_HOOK_TYPES = [
  'commit-msg',
  'post-checkout',
  'post-commit',
  'post-merge',
  'post-rewrite',
  'pre-commit',
  'pre-push',
  'pre-rebase'
];

const SUPPORTED_HOOK_CONFIG_NAMES = SUPPORTED_HOOK_TYPES.map(classify);

module.exports = {
  supportedHookTypes: SUPPORTED_HOOK_TYPES,
  supportedHookConfigNames: SUPPORTED_HOOK_CONFIG_NAMES,

  // Converts a string containing underscores/hyphens/spaces into CamelCase.
  camelCase: function(str) {
    if (!str) { return ''; }

    let camelStr = _.camelCase(str);
    camelStr = camelStr[0].toUpperCase() + camelStr.slice(1);
    return camelStr;
  },

  logger: function() {
    if (!this._logger) {
      let Logger = require('./Logger');
      this._logger = new Logger({level: process.env.LOG_LEVEL});
    }
    return this._logger;
  },

  currentVersion: function() {
    if (!this._currentVersion) {
      let packageJson = require('../package.json');
      this._currentVersion = packageJson.version;
    }
    return this._currentVersion;
  },

  mergeOptions: function(options, defaultOptions) {
    return _.defaultsDeep({}, options, defaultOptions);
  },

  parentPid: function() {
    return this.execSync('ps -o ppid= -p ' + process.pid).trim();
  },

  parentCommand: function() {
    return this.execSync('ps -o command= -p ' + this.parentPid()).trim();
  },

  isInPath: function(commandName) {
    let paths = [repoRoot()].concat(process.env.PATH.split(path.delimiter));
    let exts = process.env.PATHEXT ? process.env.PATHEXT.split(';') : [''];

    for (let i in paths) {
      let currentPath = paths[i];

      for (let j in exts) {
        let ext = exts[j];
        let commandWithExt = commandName.toLowerCase().slice(-1 * ext.length) === ext.toLowerCase() ? commandName : commandName + ext;
        let commandFullPath = [currentPath, commandWithExt].join('/');
        if (fileUtils.isExecutable(commandFullPath)) {
          return true;
        }
      }
    }

    return false;
  },

  execSync: function(command, options) {
    try {
      return childProcess.execSync(command, options).toString();
    } catch(e) {
      this.logger().debug('Error when running ' + command);
      this.logger().debug(e.message);
      if (e.stack) { this.logger().debug(e.stack); }

      return false;
    }
  },

  spawn: function(command, args, options) {
    return childProcess.spawn(command, args, options);
  },

  spawnSync: function(command, args, options) {
    return childProcess.spawnSync(command, args, options);
  },

  processorCount: function() {
    if (!this._processorCount) {
      this._processorCount = os.cpus().length;
    }

    return this._processorCount;
  }
};
