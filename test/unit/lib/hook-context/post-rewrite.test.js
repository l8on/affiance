var path = require('path');
var fse = require('fs-extra');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPostRewrite = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPostRewrite', function () {
  beforeEach('setup hook context', function () {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.argv = ['amend'];
    this.input = {};
    this.context = new HookContextPostRewrite(this.config, this.argv, this.input);

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
    it('sets hookScriptName to "post-rewrite"', function() {
      expect(this.context.hookScriptName).to.equal('post-rewrite');
    });

    it('sets hookConfigName to "PostRewrite"', function() {
      expect(this.context.hookConfigName).to.equal('PostRewrite');
    });
  });

  describe('#isAmend', function() {
    it('returns true if the first argument is amend', function() {
      this.context.argv = ['amend'];
      expect(this.context.isAmend()).to.equal(true);
    });

    it('returns false if the first argument is rebase', function() {
      this.context.argv = ['rebase'];
      expect(this.context.isAmend()).to.equal(false);
    });
  });

  describe('#isRebase', function() {
    it('returns false if the first argument is 1', function() {
      this.context.argv = ['rebase'];
      expect(this.context.isRebase()).to.equal(true);
    });

    it('returns true if there are no arguments', function() {
      this.context.argv = ['amend'];
      expect(this.context.isRebase()).to.equal(false);
    });
  });

  describe('#rewrittenCommits', function() {
    beforeEach('generate hashes', function() {
      this.oldHash1 = testHelper.randomHash();
      this.newHash1 = testHelper.randomHash();
      this.oldHash2 = testHelper.randomHash();
      this.newHash2 = testHelper.randomHash();
    });

    describe('when the rewrite was triggered by an amend', function() {
      beforeEach('setup input and args', function() {
        this.context.argv = ['amend'];
        this.inputString = this.oldHash1 + ' ' + this.newHash1 + '\n';
        this.sandbox.stub(this.context, 'inputString').returns(this.inputString);
      });

      it('parses and returns the commit info from the input stream', function() {
        var rewrittenCommits = this.context.rewrittenCommits();
        expect(rewrittenCommits).to.have.length(1);
        expect(rewrittenCommits[0]).to.have.property('oldHash', this.oldHash1);
        expect(rewrittenCommits[0]).to.have.property('newHash', this.newHash1);

      });
    });

    describe('when the rewrite was triggered by a rebase', function() {
      beforeEach('setup input and args', function() {
        this.context.argv = ['rebase'];
        this.inputString = [
          this.oldHash1 + ' ' + this.newHash1,
          this.oldHash2 + ' ' + this.newHash2
        ].join('\n');
        this.sandbox.stub(this.context, 'inputString').returns(this.inputString);
      });

      it('parses and returns the commit info from the input stream', function() {
        var rewrittenCommits = this.context.rewrittenCommits();
        expect(rewrittenCommits).to.have.length(2);

        expect(rewrittenCommits[0]).to.have.property('oldHash', this.oldHash1);
        expect(rewrittenCommits[0]).to.have.property('newHash', this.newHash1);

        expect(rewrittenCommits[1]).to.have.property('oldHash', this.oldHash2);
        expect(rewrittenCommits[1]).to.have.property('newHash', this.newHash2);
      });
    });
  });

  describe('#modifiedFiles', function() {
    beforeEach('stub rewritten commits', function() {
      this.rewrittenCommits = [{oldHash: 'HEAD@{1}', newHash: 'HEAD'}];
      this.sandbox.stub(this.context, 'rewrittenCommits').returns(this.rewrittenCommits);
    });

    it('does not include submodules', function () {
      var submoduleRepo = testHelper.tempRepo();
      fse.ensureFileSync(path.join(submoduleRepo, 'foo'));
      utils.execSync('git add foo', {cwd: submoduleRepo});
      utils.execSync('git commit -m "Initial commit"', {cwd: submoduleRepo});

      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git submodule add ' + submoduleRepo + ' test-sub 2>&1 > /dev/null');
      utils.execSync('git commit --amend -m "Add submodule"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.not.include('test-sub');

      testHelper.cleanupDirectory(submoduleRepo);
    });

    it('returns an empty list when no files were modified', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git commit --amend --allow-empty -m "Another commit"');

      expect(this.context.modifiedFiles()).to.be.empty
    });

    it('returns added files', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');

      fse.ensureFileSync(path.join(this.repoPath, 'some-file'));
      utils.execSync('git add some-file');
      utils.execSync('git commit --amend -m "Add file"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('some-file');
    });

    it('returns modified files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');

      fse.writeFileSync(filePath, 'Hello');
      utils.execSync('git add some-file');
      utils.execSync('git commit --amend -m "Modify file"');

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
      utils.execSync('git commit --amend --allow-empty -m "Delete file"');

      expect(this.context.modifiedFiles()).to.be.empty
    });

    it('returns renamed files', function() {
      var filePath = path.join(this.repoPath, 'some-file');
      fse.ensureFileSync(filePath);
      utils.execSync('git add some-file');
      utils.execSync('git commit -m "Add file"');

      utils.execSync('git mv some-file renamed-file');
      utils.execSync('git commit --amend -m "Rename file"');

      var modifiedFiles = this.context.modifiedFiles();
      expect(modifiedFiles).to.have.length(1);
      expect(modifiedFiles[0]).to.include('renamed-file');
    });
  });
});
