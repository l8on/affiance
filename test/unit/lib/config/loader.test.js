var _ = require('lodash');
var fse = require('fs-extra');
var path = require('path');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var loader = testHelper.requireSourceModule(module);
var yaml = require('js-yaml');
var utils = testHelper.requireSourceModule(module, 'lib/utils');

var defaultConfigLocation  = path.join(__dirname, '../../../../config/default.yml');
var defaultConfig = yaml.safeLoad(fse.readFileSync(defaultConfigLocation));

describe('loader', function() {
  beforeEach('create git repo', function() {
    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);
  });

  afterEach('reset cwd on process', function() {
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
  });

  describe('.loadRepoConfig', function() {
    it('loads the default configuration if none is defined', function() {
      var config = loader.loadRepoConfig();
      expect(config.json).to.deep.equal(defaultConfig);
    });
  });

  describe('when the repo contains a config file', function() {
    beforeEach('setup config file', function() {
      this.configContents = "pluginDirectory: 'some-directory'";
      fse.writeFileSync('.affiance.yml', this.configContents);
    });

    it('merges the loaded config with the default configuration', function() {
      var config = loader.loadRepoConfig();
      var defaultCopy = _.merge({}, defaultConfig);

      defaultCopy.pluginDirectory = 'some-directory';
      expect(config.json).to.deep.equal(defaultCopy);
    });
  });
});
