'use strict';
const fse = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const AffianceError = require('../error');
const gitRepo = require('../gitRepo');
const Config = require('./');

function verifySignatures(config) {
  if (!config.storedSignature().length) {
    throw AffianceError.error(
      AffianceError.ConfigurationSignatureChanged,
      'No previously recorded signature for configuration file.\n' +
      'Run `./node_modules/.bin/affiance sign` if you trust the hooks in this repository.'
    );
  } else if (config.hasSignatureChanged()) {
    throw AffianceError.error(
      AffianceError.ConfigurationSignatureChanged,
      'Signature of configuration file has changed!\n' +
      "Run `./node_modules/.bin/affiance sign` once you've verified the configuration changes."
    );
  }
}

module.exports = {
  CONFIG_FILE_NAME: '.affiance.yml',

  loadRepoConfig: function(options) {
    options = options || {};

    let configJson = null;
    let repoConfigLocation = path.join(gitRepo.repoRoot(), this.CONFIG_FILE_NAME);
    let defaultConfigLocation = path.join(__dirname, '../../config/default.yml');
    let defaultConfigJson = yaml.safeLoad(fse.readFileSync(defaultConfigLocation, 'utf8'));

    if (fse.existsSync(repoConfigLocation)) {
      let repoConfigJson = yaml.safeLoad(fse.readFileSync(repoConfigLocation, 'utf8'));
      configJson = Config.smartMerge(defaultConfigJson, repoConfigJson || {});
    } else {
      configJson = defaultConfigJson;
    }

    let config = new Config(configJson, options);

    if (options.verify !== false && config.shouldVerifySignatures()) {
      verifySignatures(config);
    }

    return config;
  }
};


