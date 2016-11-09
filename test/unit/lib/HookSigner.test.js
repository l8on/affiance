var testHelper = require('../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookSigner = testHelper.requireSourceModule(module);

describe('HookSigner', function () {
  describe('#hasSignatureChanged', function() {
    beforeEach('setup hook to sign', function() {
      this.oldCwd = process.cwd();
      this.repoPath = testHelper.tempRepo();
      process.chdir(this.repoPath);

      this.sandbox = sinon.sandbox.create();
      this.hookConfig = {enabled: false};
      this.hookContents =
        'module.exports = function SomeHook() {\n' +
        '  this.run = function() {\n' +
        "    return  'pass';\n"+
        '  }\n' +
        '};\n';

      this.config = {
        forHook: this.sandbox.stub().returns(this.hookConfig),
        pluginDirectory: this.sandbox.stub().returns('.git-hooks')
      };

      this.context = {
        hookConfigName: 'PreCommit',
        hookScriptName: 'pre-commit'
      };

      this.signer = new HookSigner('SomeHook', this.config, this.context);
      this.sandbox.stub(this.signer, 'hookContents').returns(this.hookContents);
      this.signer.updateSignature();
    });

    afterEach('restore sandbox', function() {
      this.sandbox.restore();
      if(!this.oldCwd) { return; }

      process.chdir(this.oldCwd);
      testHelper.cleanupDirectory(this.repoPath);
    });

    it('returns false if nothing has changed', function() {
      expect(this.signer.hasSignatureChanged()).to.equal(false);
    });

    it('returns false if nothing has changed and the user has chosen to skip', function() {
      this.hookConfig.skip = true;
      expect(this.signer.hasSignatureChanged()).to.equal(false);
    });

    describe('when the hook code has changed', function() {
      beforeEach('change hook code', function() {
        this.hookContents =
          'module.exports = function SomeHook() {\n' +
          '  this.run = function() {\n' +
          "    return  'fail';\n"+
          '  }\n' +
          '};\n';

        this.signer.hookContents.returns(this.hookContents);
      });

      it('returns false if nothing has changed', function() {
        expect(this.signer.hasSignatureChanged()).to.equal(true);
      });
    });

    describe('when the hook config has changed', function() {
      beforeEach('change hook code', function() {
        this.hookConfig.enabled = true;
      });

      it('returns false if nothing has changed', function() {
        expect(this.signer.hasSignatureChanged()).to.equal(true);
      });
    });
  });
});
