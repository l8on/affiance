var fse = require('fs-extra');
var path = require('path');
var yaml = require('js-yaml');
var gitRepo = require('../gitRepo');
var Config = require('./');

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
      configJson = Config.smartMerge(defaultConfigJson, repoConfigJson);
    } else {
      configJson = defaultConfigJson;
    }

    var config = new Config(configJson);

    // TODO: Verify config signature!!
    return config;
  }
};

