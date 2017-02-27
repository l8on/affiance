var path = require('path');
var fse = require('fs-extra');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPostMerge = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPostMerge', function () {
  beforeEach('setup hook context', function () {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.argv = [];
    this.input = {};
    this.context = new HookContextPostMerge(this.config, this.argv, this.input);

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
    it('sets hookScriptName to "post-merge"', function() {
      expect(this.context.hookScriptName).to.equal('post-merge');
    });

    it('sets hookConfigName to "PostMerge"', function() {
      expect(this.context.hookConfigName).to.equal('PostMerge');
    });
  });

  describe('#isSquashCommit', function() {
    it('returns true if the first argument is 1', function() {
      this.context.argv = [1];
      expect(this.context.isSquashCommit()).to.equal(true);
    });

    it('returns false if there are no arguments', function() {
      this.context.argv = [];
      expect(this.context.isSquashCommit()).to.equal(false);
    });
  });

  describe('#isMergeCommit', function() {
    it('returns false if the first argument is 1', function() {
      this.context.argv = [1];
      expect(this.context.isMergeCommit()).to.equal(false);
    });

    it('returns true if there are no arguments', function() {
      this.context.argv = [];
      expect(this.context.isMergeCommit()).to.equal(true);
    });
  });

  describe('#modifiedFiles', function() {
    it('does not include submodules', function() {
      var submoduleRepo = testHelper.tempRepo();
      fse.ensureFileSync(path.join(submoduleRepo, 'foo'));
      utils.execSync('git add foo', {cwd: submoduleRepo});
      utils.execSync('git commit -m "Initial commit"', {cwd: submoduleRepo});

      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');
      utils.execSync('git submodule add ' + submoduleRepo + ' test-sub 2>&1 > /dev/null');
      utils.execSync('git commit -m "Add submodule"');
      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --no-ff --no-edit child');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.not.include('test-sub');

      testHelper.cleanupDirectory(submoduleRepo);
    });

    it('returns an empty list when no files were staged', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Branch commit"');
      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --no-ff --no-edit child');

      expect(this.context.modifiedFiles()).to.be.empty
    });

    it('returns added files', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');
      fse.ensureFileSync(path.join(this.repoPath, 'some-file'));
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file branch commit"');
      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --no-ff --no-edit child');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('some-file');
    });

    it('returns modified files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file branch commit"');
      fse.writeFileSync(filePath, 'Hello');
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Modify file branch commit"');
      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --no-ff --no-edit child');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('some-file');
    });

    it('does not return deleted files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');

      utils.execSync('git rm some-file');
      utils.execSync('git commit -m "Delete file"');

      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --no-ff --no-edit child');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.be.empty
    });

    it('returns files changed during a squash merge', function() {
      this.context.argv = [1];

      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b child > /dev/null 2>&1');
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);

      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Branch commit"');
      utils.execSync('git checkout master > /dev/null 2>&1');
      utils.execSync('git merge --squash child');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('some-file');
    });
  });

  describe('#modifiedLinesInFile', function() {
    describe('when the file contains a trailing newline', function() {
      it('only returns the lines with content', function() {
        var filePath = path.join(this.repoPath, 'some-file');
        utils.execSync('git commit --allow-empty -m "Initial commit"');
        utils.execSync('git checkout -b child > /dev/null 2>&1');
        fse.writeFileSync(filePath, '1\n2\n3\n');
        utils.execSync('git add some-file');
        utils.execSync('git commit -m "Add file branch commit"');
        utils.execSync('git checkout master > /dev/null 2>&1');
        utils.execSync('git merge --no-ff --no-edit child');

        var modifiedLines = this.context.modifiedLinesInFile('some-file');
        expect(modifiedLines).to.deep.equal(['1', '2', '3'])
      });
    });

    describe('when the file does not contain a trailing newline', function() {
      it('returns the lines with content', function() {
        var filePath = path.join(this.repoPath, 'some-file');
        utils.execSync('git commit --allow-empty -m "Initial commit"');
        utils.execSync('git checkout -b child > /dev/null 2>&1');
        fse.writeFileSync(filePath, '1\n2\n3');
        utils.execSync('git add some-file');
        utils.execSync('git commit -m "Add file branch commit"');
        utils.execSync('git checkout master > /dev/null 2>&1');
        utils.execSync('git merge --no-ff --no-edit child');

        var modifiedLines = this.context.modifiedLinesInFile('some-file');
        expect(modifiedLines).to.deep.equal(['1', '2', '3'])
      });
    });

    describe('when the merge is made using squash', function() {
      beforeEach('set argv for squahes', function() {
        this.context.argv = [1];
      });

      it('returns the lines with content', function() {
        var filePath = path.join(this.repoPath, 'some-file');
        utils.execSync('git commit --allow-empty -m "Initial commit"');
        utils.execSync('git checkout -b child > /dev/null 2>&1');
        fse.writeFileSync(filePath, '1\n2\n3\n');
        utils.execSync('git add some-file');
        utils.execSync('git commit -m "Add file branch commit"');
        utils.execSync('git checkout master > /dev/null 2>&1');
        utils.execSync('git merge --squash child');

        var modifiedLines = this.context.modifiedLinesInFile('some-file');
        expect(modifiedLines).to.deep.equal(['1', '2', '3'])
      });
    });
  });
});
