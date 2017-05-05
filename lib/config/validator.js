'use strict';
const utils = require('../utils');
const AffianceError = require('../error');

module.exports = {
  validate: function(config, json, options) {
    options = options || {};

    json = this.convertNullsToEmptyHashes(json);
    this.ensureHookTypeSectionsExist(json);
    this.checkHookNameFormat(json);
    this.checkHookEnv(json);
    if(!options['default']) { this.checkForMissingEnabledOption(json); }
    this.checkForTooManyProcessors(config, json);

    return json;
  },

  convertNullsToEmptyHashes: function(json) {
    for (let key in json) {
      let value = json[key];

      if (value === null || typeof value === 'undefined') {
        json[key] = {};
      } else if (typeof value === 'object') {
        json[key] = this.convertNullsToEmptyHashes(value);
      }
    }

    return json;
  },

  ensureHookTypeSectionsExist: function(json) {
    utils.supportedHookConfigNames.forEach((hookConfigName) => {
      json[hookConfigName] = json[hookConfigName] || {};
      json[hookConfigName]['ALL'] = json[hookConfigName]['ALL'] || {};
    });
  },

  checkHookNameFormat: function(json) {
    let errors = [];

    utils.supportedHookConfigNames.forEach((hookConfigName) => {
      let hookSection = json[hookConfigName];
      for (let hookName in hookSection) {
        if (hookName === 'ALL') { continue; }

        if (!hookName.match(/^[A-Za-z0-9]+$/)) {
          errors.push(hookConfigName + '::' + hookName +
            ' has an invalid name ' + hookName +
            '. It must contain only alphanumeric ' +
            'characters (no underscores or dashes, etc.)'
          );
        }
      }
    });

    if (errors.length) {
      utils.logger().error(errors.join('\n'));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had invalid names'
      );
    }
  },

  checkHookEnv: function(json) {
    let errors = [];

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      let hookSection = json[hookConfigName];
      for (let hookName in hookSection) {
        let hookConfig = hookSection[hookName];
        let hookEnv = hookConfig['env'] || {};

        if (typeof hookEnv !== 'object') {
          errors.push(hookConfigName + '::' + hookName +
            ' has an invalid `env` specified: ' +
            'must be a hash of environment letiable name to string value.'
          );
        }

        for (let envName in hookEnv) {
          let envValue = hookEnv[envName];

          if (envName.indexOf('=') > -1) {
            errors.push(hookConfigName + '::' + hookName +
              ' has an invalid `env` specified: ' +
              'letiable name `' + envName + '` cannot contain `=`.'
            );
          }

          if (envValue != null && typeof envValue !== 'string') {
            errors.push(hookConfigName + '::' + hookName +
              ' value of `' + envName + '` must be a string or `nil`, but was ' +
              envValue + ' ' + (typeof  envValue)
            );
          }
        }
      }
    });

    if (errors.length) {
      utils.logger().error(errors.join('\n'));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had an invalid `env` configuration option'
      );
    }
  },

  checkForMissingEnabledOption: function(json) {
    let anyWarnings = false;

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      let hookTypeConfig = json[hookConfigName];
      for (let hookName in hookTypeConfig) {
        if (hookName === 'ALL') { continue; }

        let hookConfig = hookTypeConfig[hookName];
        if (typeof hookConfig['enabled'] === 'undefined') {
          utils.logger().warn(
            hookConfigName + '::' + hookName,
            'does not explicitly set `enabled` option in affiance config file'
          );
          anyWarnings = true;
        }
      }
    });

    if (anyWarnings) {
      utils.logger().newline();
    }
  },

  checkForTooManyProcessors: function(config, json) {
    let concurrency = config.concurrency();
    let errors = [];

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      let hookSection = json[hookConfigName];
      for (let hookName in hookSection) {
        let hookConfig = hookSection[hookName] || {};
        let processors = hookConfig.processors || 1;

        if (processors > concurrency) {
          errors.push(
            hookConfigName + '::' + hookName +
            ' `processors` value' +
            '(' + processors + ')' +
            'is larger than the global `concurrency` option' +
            '(' + concurrency + ')'
          );
        }
      }
    });

    if (errors.length) {
      utils.logger().error(errors.join('\n'));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had invalid `processor` value configured'
      );
    }
  }
};
