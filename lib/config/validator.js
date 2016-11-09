var utils = require('../utils');
var AffianceError = require('../error');

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
    for (var key in json) {
      var value = json[key];

      if (value === null || typeof value === 'undefined') {
        json[key] = {};
      } else if (typeof value === 'object') {
        json[key] = this.convertNullsToEmptyHashes(value);
      }
    }

    return json;
  },

  ensureHookTypeSectionsExist: function(json) {
    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      json[hookConfigName] = json[hookConfigName] || {};
      json[hookConfigName]['ALL'] = json[hookConfigName]['ALL'] || {};
    });
  },

  checkHookNameFormat: function(json) {
    var errors = [];

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      var hookSection = json[hookConfigName];
      for (var hookName in hookSection) {
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
      utils.logger().error(errors.join("\n"));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had invalid names'
      );
    }
  },

  checkHookEnv: function(json) {
    var errors = [];

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      var hookSection = json[hookConfigName];
      for (var hookName in hookSection) {
        var hookConfig = hookSection[hookName];
        var hookEnv = hookConfig['env'] || {};

        if (typeof hookEnv !== 'object') {
          errors.push(hookConfigName + '::' + hookName +
            ' has an invalid `env` specified: ' +
            'must be a hash of environment variable name to string value.'
          );
        }

        for (var envName in hookEnv) {
          var envValue = hookEnv[envName];

          if (envName.indexOf('=') > -1) {
            errors.push(hookConfigName + '::' + hookName +
              ' has an invalid `env` specified: ' +
              'variable name `' + envName + '` cannot contain `=`.'
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
      utils.logger().error(errors.join("\n"));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had an invalid `env` configuration option'
      );
    }
  },

  checkForMissingEnabledOption: function(json) {
    var anyWarnings = false;

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      var hookTypeConfig = json[hookConfigName];
      for (var hookName in hookTypeConfig) {
        if (hookName === 'ALL') { continue; }

        var hookConfig = hookTypeConfig[hookName];
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
    var concurrency = config.concurrency();
    var errors = [];

    utils.supportedHookConfigNames.forEach(function(hookConfigName) {
      var hookSection = json[hookConfigName];
      for (var hookName in hookSection) {
        var hookConfig = hookSection[hookName] || {};
        var processors = hookConfig.processors || 1;

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
      utils.logger().error(errors.join("\n"));
      utils.logger().newline();
      throw AffianceError.error(
        AffianceError.ConfigurationError,
        'One or more hooks had invalid `processor` value configured'
      );
    }
  }
};
