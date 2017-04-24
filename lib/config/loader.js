var fse = require('fs-extra');
var path = require('path');
var yaml = require('js-yaml');
var AffianceError = require('../error');
var gitRepo = require('../gitRepo');
var Config = require('./');

function verifySignatures(config) {
  if (!config.storedSignature().length) {
    throw AffianceError.error(
      AffianceError.ConfigurationSignatureChanged,
      "No previously recorded signature for configuration file.\n" +
      'Run `affiance sign` if you trust the hooks in this repository.'
    );
  } else if (config.hasSignatureChanged()) {
    throw AffianceError.error(
      AffianceError.ConfigurationSignatureChanged,
      "Signature of configuration file has changed!\n" +
      "Run `affiance sign` once you've verified the configuration changes."
    );
  }
}

module.exports = {
  CONFIG_FILE_NAME: '.affiance.yml',

  loadRepoConfig: function(options) {
    options = options || {};

    var configJson = null;
    var repoConfigLocation = path.join(gitRepo.repoRoot(), this.CONFIG_FILE_NAME);
    var defaultConfigLocation = path.join(__dirname, '../../config/default.yml');
    var defaultConfigJson = yaml.safeLoad(fse.readFileSync(defaultConfigLocation, 'utf8'));

    if (fse.existsSync(repoConfigLocation)) {
      var repoConfigJson = yaml.safeLoad(fse.readFileSync(repoConfigLocation, 'utf8'));
      configJson = Config.smartMerge(defaultConfigJson, repoConfigJson || {});
    } else {
      configJson = defaultConfigJson;
    }

    var config = new Config(configJson, options);

    if (options.verify !== false && config.shouldVerifySignatures()) {
      verifySignatures(config);
    }

    return config;
  }
};


