var path = require('path');
var fse = require('fs-extra');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPreCommit = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPreCommit', function () {
  beforeEach('setup hook context', function () {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.argv = [];
    this.input = {};
    this.context = new HookContextPreCommit(this.config, this.argv, this.input);

    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);

    this.sandbox.stub(utils, 'parentCommand').returns('git commit');
  });

  afterEach('restore sandbox', function () {
    this.sandbox.restore();
    if (!this.oldCwd) {
      return;
    }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
  });

  describe('constructor', function () {
    it('sets hookScriptName to "pre-commit"', function () {
      expect(this.context.hookScriptName).to.equal('pre-commit');
    });

    it('sets hookConfigName to "PreCommit"', function () {
      expect(this.context.hookConfigName).to.equal('PreCommit');
    });
  });

  describe('#isAmendment', function() {
    it('returns true if the command is a standard amendment', function() {
      utils.parentCommand.returns('git commit --amend');
      expect(this.context.isAmendment()).to.equal(true);
    });

    describe('when an alias is used', function() {
      beforeEach('setup aliases', function() {
        utils.execSync('git config alias.amend "commit --amend"');
        utils.execSync('git config alias.other-amend "commit --amend"');
      });

      it('returns true when using the first alias', function() {
        utils.parentCommand.returns('git amend');
        expect(this.context.isAmendment()).to.equal(true);
      });

      it('returns true when using the second alias', function() {
        utils.parentCommand.returns('git other-amend');
        expect(this.context.isAmendment()).to.equal(true);
      });
    });

    describe('when NOT amending a commit', function() {
      it('returns false when using the first alias', function() {
        utils.parentCommand.returns('git commit');
        expect(this.context.isAmendment()).to.equal(false);
      });

      describe('using an alias contining "--amend"', function() {
        beforeEach('setup aliases', function() {
          utils.execSync('git config alias.no--amend commit');
        });

        it('returns false', function() {
          utils.parentCommand.returns('git no--amend');
          expect(this.context.isAmendment()).to.equal(false);
        });
      });
    });
  });

  describe('#setupEnvironment', function() {
    beforeEach('setup file paths', function() {
      this.paths = {
        'tracked-file': path.join(this.repoPath, 'tracked-file'),
        'other-tracked-file': path.join(this.repoPath, 'other-tracked-file'),
        'untracked-file': path.join(this.repoPath, 'untracked-file')
      };
    });

    describe('when there are no staged changes', function() {
      beforeEach('setup complex commit with no stages changes', function() {
        fse.writeFileSync(this.paths['tracked-file'], 'Hello World');
        fse.writeFileSync(this.paths['other-tracked-file'], 'Hello Other World');

        utils.execSync('git add tracked-file other-tracked-file');
        utils.execSync('git commit -m "Add tracked-file and other-tracked-file"');

        fse.writeFileSync(this.paths['untracked-file'], 'Hello Again');
        fse.appendFileSync(this.paths['other-tracked-file'], '\nSome more text');
      });

      it('keeps already-committed files', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'tracked-file'), 'utf8')).to.equal('Hello World');
      });

      it('does not keep unstaged changes', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'other-tracked-file'), 'utf8')).to.equal('Hello Other World');
      });

      it('keeps untracked files', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'untracked-file'), 'utf8')).to.equal('Hello Again');
      });

      it('keeps moodification times the same', function(done) {
        var modifiedTimes = {
          'tracked-file': fileUtils.modifiedTime(this.paths['tracked-file']),
          'other-tracked-file': fileUtils.modifiedTime(this.paths['other-tracked-file']),
          'untracked-file': fileUtils.modifiedTime(this.paths['untracked-file'])
        };

        var self = this;
        setTimeout(function() {
          self.context.setupEnvironment();

          expect(fileUtils.modifiedTime(self.paths['tracked-file'])).to.equal(modifiedTimes['tracked-file']);
          expect(fileUtils.modifiedTime(self.paths['other-tracked-file'])).to.equal(modifiedTimes['other-tracked-file']);
          expect(fileUtils.modifiedTime(self.paths['untracked-file'])).to.equal(modifiedTimes['untracked-file']);
          done();
        }, 1000);
      });
    });

    describe('when there are staged changes', function() {
      beforeEach('setup complex commit', function() {
        fse.writeFileSync(this.paths['tracked-file'], 'Hello World');
        fse.writeFileSync(this.paths['other-tracked-file'], 'Hello Other World');

        utils.execSync('git add tracked-file other-tracked-file');
        utils.execSync('git commit -m "Add tracked-file and other-tracked-file"');

        fse.writeFileSync(this.paths['untracked-file'], 'Hello Again');
        fse.appendFileSync(this.paths['tracked-file'], '\nSome more text');
        fse.appendFileSync(this.paths['other-tracked-file'], '\nSome more text');

        utils.execSync('git add tracked-file');
        fse.appendFileSync(this.paths['tracked-file'], 'Yet some more text');

      });

      it('keeps already-committed files', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'tracked-file'), 'utf8')).to.equal('Hello World\nSome more text');
      });

      it('does not keep unstaged changes', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'other-tracked-file'), 'utf8')).to.equal('Hello Other World');
      });

      it('keeps untracked files', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(path.join(this.repoPath, 'untracked-file'), 'utf8')).to.equal('Hello Again');
      });

      it('keeps moodification times the same', function(done) {
        var paths = {
          'tracked-file': path.join(this.repoPath, 'tracked-file'),
          'other-tracked-file': path.join(this.repoPath, 'other-tracked-file'),
          'untracked-file': path.join(this.repoPath, 'untracked-file')
        };

        var modifiedTimes = {
          'tracked-file': fileUtils.modifiedTime(paths['tracked-file']),
          'other-tracked-file': fileUtils.modifiedTime(paths['other-tracked-file']),
          'untracked-file': fileUtils.modifiedTime(paths['untracked-file'])
        };

        var self = this;
        setTimeout(function() {
          self.context.setupEnvironment();
          expect(fileUtils.modifiedTime(paths['tracked-file'])).to.equal(modifiedTimes['tracked-file']);
          expect(fileUtils.modifiedTime(paths['other-tracked-file'])).to.equal(modifiedTimes['other-tracked-file']);
          expect(fileUtils.modifiedTime(paths['untracked-file'])).to.equal(modifiedTimes['untracked-file']);
          done();
        }, 900);
      });
    });

    //TODO: finish the rest of these tests
    describe('when renaming a file during an amendment', function() {

    });
  });
});
