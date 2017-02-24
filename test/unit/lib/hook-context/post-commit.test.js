var path = require('path');
var fse = require('fs-extra');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPostCommit = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPostCommit', function () {
  beforeEach('setup hook context', function () {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.argv = [];
    this.input = {};
    this.context = new HookContextPostCommit(this.config, this.argv, this.input);

    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);

  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
  });

  describe('constructor', function() {
    it('sets hookScriptName to "post-commit"', function() {
      expect(this.context.hookScriptName).to.equal('post-commit');
    });

    it('sets hookConfigName to "PostCommit"', function() {
      expect(this.context.hookConfigName).to.equal('PostCommit');
    });
  });

  describe('#modifiedFiles', function() {
    it('does not include submodules', function() {
      var submoduleRepo = testHelper.tempRepo();
      fse.ensureFileSync(path.join(submoduleRepo, 'foo'));
      utils.execSync('git add foo', {cwd: submoduleRepo});
      utils.execSync('git commit -m "Initial commit"', {cwd: submoduleRepo});

      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git submodule add ' + submoduleRepo + ' test-sub 2>&1 > /dev/null');
      utils.execSync('git commit -m "Add submodule"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.not.include('test-sub');

      testHelper.cleanupDirectory(submoduleRepo);
    });

    it('returns an empty list when no files were modified', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git commit --allow-empty -m "Another commit"');

      expect(this.context.modifiedFiles()).to.be.empty
    });

    it('returns added files', function() {
      fse.ensureFileSync(path.join(this.repoPath, 'foo'));
      utils.execSync('git add foo');
      utils.execSync('git commit -m "Add file"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('foo');
    });

    it('returns modified files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');

      fse.writeFileSync(filePath, 'Hello');
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Modify file"');


      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('some-file');
    });

    it('does not return deleted files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');

      utils.execSync('git rm some-file');
      utils.execSync('git commit -m "Delete file"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.be.empty
    });

    it('does not return renamed files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');

      utils.execSync('git mv some-file renamed-file');
      utils.execSync('git commit -m "Rename file"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('renamed-file');
    });
  });
});
