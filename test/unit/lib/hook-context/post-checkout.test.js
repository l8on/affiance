var path = require('path');
var fse = require('fs-extra');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPostCheckout = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPostCheckout', function () {
  beforeEach('setup hook context', function () {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.previousHead = 'PREV-HASH';
    this.newHead = 'NEW-HASH';
    this.branchFlag = '1';
    this.argv = [this.previousHead, this.newHead, this.branchFlag];
    this.input = {};
    this.context = new HookContextPostCheckout(this.config, this.argv, this.input);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  describe('constructor', function() {
    it('sets hookScriptName to "post-checkout"', function() {
      expect(this.context.hookScriptName).to.equal('post-checkout');
    });

    it('sets hookConfigName to "PostCheckout"', function() {
      expect(this.context.hookConfigName).to.equal('PostCheckout');
    });
  });

  describe('#previousHead', function() {
    it('returns the provided previous head', function() {
      expect(this.context.previousHead()).to.equal(this.previousHead);
    });
  });

  describe('#newHead', function() {
    it('returns the provided new head', function() {
      expect(this.context.newHead()).to.equal(this.newHead);
    });
  });

  describe('#isBranchCheckout', function() {
    it('returns true if the flag is "1"', function() {
      this.context.argv[2] = '1';
      expect(this.context.isBranchCheckout()).to.equal(true);
    });

    it('returns false if the flag is "0"', function() {
      this.context.argv[2] = '0';
      expect(this.context.isBranchCheckout()).to.equal(false);
    });
  });

  describe('#isFileCheckout', function() {
    it('returns true if the flag is "1"', function() {
      this.context.argv[2] = '0';
      expect(this.context.isFileCheckout()).to.equal(true);
    });

    it('returns false if the flag is "0"', function() {
      this.context.argv[2] = '1';
      expect(this.context.isFileCheckout()).to.equal(false);
    });
  });

  describe('#modifiedFiles', function() {
    beforeEach('set read commit references', function() {
      this.context.argv[0] = 'HEAD~';
      this.context.argv[1] = 'HEAD';

      this.oldCwd = process.cwd();
      this.repoPath = testHelper.tempRepo();
      process.chdir(this.repoPath);
    });

    afterEach('reset cwd on process', function() {
      if(!this.oldCwd) { return; }

      process.chdir(this.oldCwd);
      testHelper.cleanupDirectory(this.repoPath);
    });

    describe('when no files were modified', function() {
      beforeEach('add some empty commits', function() {
        utils.spawnSync('git', ['commit', '--allow-empty', '-m', 'Initial commit']);
        utils.spawnSync('git', ['commit', '--allow-empty', '-m', 'Second commit']);
      });

      it('returns an empty array', function() {
        expect(this.context.modifiedFiles()).to.deep.equal([]);
      });
    });

    describe('when a files were added', function() {
      beforeEach('add some empty commits', function() {
        utils.spawnSync('git', ['commit', '--allow-empty', '-m', 'Initial commit']);
        this.addedFilePath = path.join(this.repoPath, 'that-file-tho');
        fse.ensureFileSync(this.addedFilePath);
        utils.spawnSync('git', ['add', 'that-file-tho']);
        utils.spawnSync('git', ['commit', '-m', 'Add that file, tho']);
      });

      it('returns the added file', function() {
        expect(this.context.modifiedFiles()).to.deep.equal([fse.realpathSync(this.addedFilePath)]);
      });
    });

    describe('when files were deleted', function() {
      beforeEach('change a file', function() {
        utils.spawnSync('git', ['commit', '--allow-empty', '-m', 'Initial commit']);

        this.addedFilePath = path.join(this.repoPath, 'that-file-tho');
        fse.ensureFileSync(this.addedFilePath);
        utils.spawnSync('git', ['add', 'that-file-tho']);
        utils.spawnSync('git', ['commit', '-m', 'Add that file, tho']);
        utils.spawnSync('git', ['rm', 'that-file-tho']);
        utils.spawnSync('git', ['commit', '-m', 'Remove some content, lo']);
      });

      it('returns an empty array', function() {
        expect(this.context.modifiedFiles()).to.deep.equal([]);
      });
    });

    describe('when files were renamed', function() {
      beforeEach('change a file', function() {
        this.addedFilePath = path.join(this.repoPath, 'that-file-tho');
        fse.ensureFileSync(this.addedFilePath);
        utils.spawnSync('git', ['add', 'that-file-tho']);
        utils.spawnSync('git', ['commit', '-m', 'Add that file, tho']);

        this.renamedFilePath = path.join(this.repoPath, 'renamed-file-go');
        utils.spawnSync('git', ['mv', 'that-file-tho', 'renamed-file-go']);
        utils.spawnSync('git', ['commit', '-m', 'Rename file, yo']);
      });

      it('returns the final filename', function() {
        expect(this.context.modifiedFiles()).to.deep.equal([fse.realpathSync(this.renamedFilePath)]);
      });
    });
  });
});
