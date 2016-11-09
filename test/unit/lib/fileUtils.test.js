var fse = require('fs-extra');
var testHelper = require('../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var fileUtils = testHelper.requireSourceModule(module);
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');


describe('fileUtils', function() {
  describe('isDirectory', function () {
    it('correctly identifies directories', function() {
      expect(fileUtils.isDirectory(__dirname)).to.equal(true);
      expect(fileUtils.isDirectory(module.filename)).to.equal(false);
    });
  });

  describe('isFile', function () {
    it('correctly identifies files', function() {
      expect(fileUtils.isFile(__dirname)).to.equal(false);
      expect(fileUtils.isFile(module.filename)).to.equal(true);
    });
  });

  describe('isExecutable', function () {
    it('correctly identifies executable files', function() {
      expect(fileUtils.isExecutable(module.filename)).to.equal(false);
      var hookFileName = fse.realpathSync(__dirname + '../../../../template-dir/hooks/affiance-hook');
      expect(fileUtils.isExecutable(hookFileName)).to.equal(true);
    });
  });

  describe('convertGlobToAbsolute', function() {
    beforeEach('stub repo root', function() {
      this.sandbox = sinon.sandbox.create();

      this.repoRoot = '/repo/root';
      this.sandbox.stub(fileUtils, '_repoRoot').returns(this.repoRoot);
    });

    afterEach('stub repo root', function() {
      this.sandbox.restore();
    });

    it('makes the file glob absolute based on the git repo', function() {
      expect(fileUtils.convertGlobToAbsolute('lib/file*Glob.?')).to.equal(this.repoRoot + '/lib/file*Glob.?')
    });
  });

  describe('matchesPath', function() {
    it('returns true if the glob matches the provided path', function() {
      expect(fileUtils.matchesPath('test', __dirname)).to.equal(true);
      expect(fileUtils.matchesPath('test*', __dirname)).to.equal(true);
      expect(fileUtils.matchesPath(__dirname + '/fileUtils*', module.filename)).to.equal(true);
    });

    it('returns false if the glob does not match the provided path', function() {
      expect(fileUtils.matchesPath('*best*', __dirname)).to.equal(false);
      expect(fileUtils.matchesPath(__dirname + '/fileUtils.integration*', module.filename)).to.equal(false);
      expect(fileUtils.matchesPath(__dirname + '/fileUtilities*', module.filename)).to.equal(false);
    });
  });
});

