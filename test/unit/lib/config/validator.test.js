var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var validator = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var AffianceError = testHelper.requireSourceModule(module, 'lib/error');

describe('validator', function() {
  describe('.validate', function() {
    it('throws an error when the hook has an invalid name', function() {
      var configJson = {
        PreCommit: {
          My_Hook: {
            enabled: false
          }
        }
      };
      var config = new Config(configJson, {validate: false});
      var error = null;

      try {
        validator.validate(config, configJson, {});
      } catch(e) {
        error = e;
      }

      expect(error).to.exist
      expect(error.affianceName).to.equal(AffianceError.ConfigurationError);
      expect(error.message).to.match(/invalid name/)
    });

    describe('when hook has `env` set', function() {
      beforeEach('setup config', function() {
        this.env = {};

        this.configJson = {
          PreCommit: {
            MyHook: {
              enabled: true,
              env: this.env
            }
          }
        };
      });

      it('throws an error if the env is set to string', function() {
        this.configJson.PreCommit.MyHook.env = 'SOME_ENV_VAR=1';
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.exist
        expect(error.affianceName).to.equal(AffianceError.ConfigurationError)
      });

      it('throws an error if an env value is a number', function() {
        this.configJson.PreCommit.MyHook.env = {SOME_ENV_VAR: 1, SOME_ENV_VAR_2: 2};
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.exist
        expect(error.affianceName).to.equal(AffianceError.ConfigurationError);
        expect(error.message).to.match(/invalid `env` configuration/);
      });

      it('throws an error if an env value is a boolean', function() {
        this.configJson.PreCommit.MyHook.env = {SOME_ENV_VAR: true, SOME_ENV_VAR_2: false};
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.exist
        expect(error.affianceName).to.equal(AffianceError.ConfigurationError);
        expect(error.message).to.match(/invalid `env` configuration/);
      });

      it('throws an error if an env value is a boolean', function() {
        this.configJson.PreCommit.MyHook.env = {SOME_ENV_VAR: '1', SOME_ENV_VAR_2: '2'};
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).not.to.exist
      });
    });

    describe('when hook has `processors` set', function() {
      beforeEach('setup config', function () {
        this.concurrency = 4;
        this.configJson = {
          concurrency: this.concurrency,
          PreCommit: {
            MyHook: {
              enabled: true,
              processors: this.concurrency
            }
          }
        };
      });

      it('throws an error if it is larger than concurrency', function() {
        this.configJson.PreCommit.MyHook.processors = this.concurrency + 1;
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.exist
        expect(error.affianceName).to.equal(AffianceError.ConfigurationError);
        expect(error.message).to.match(/invalid `processor` value configured/);
      });

      it('is valid when equal to concurrency', function() {
        this.configJson.PreCommit.MyHook.processors = this.concurrency;
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.not.exist
      });

      it('is valid when less than concurrency', function() {
        this.configJson.PreCommit.MyHook.processors = this.concurrency - 1;
        var config = new Config(this.configJson, {validate: false});
        var error = null;

        try {
          validator.validate(config, this.configJson, {});
        } catch (e) {
          error = e;
        }

        expect(error).to.not.exist
      });
    });
  });
});
