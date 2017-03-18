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

        expect(fse.readFileSync(this.paths['tracked-file'], 'utf8')).to.equal('Hello World');
      });

      it('does not keep unstaged changes', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(this.paths['other-tracked-file'], 'utf8')).to.equal('Hello Other World');
      });

      it('keeps untracked files', function() {
        this.context.setupEnvironment();

        expect(fse.readFileSync(this.paths['untracked-file'], 'utf8')).to.equal('Hello Again');
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
        fse.appendFileSync(this.paths['tracked-file'], '\nYet some more text');

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
        var paths = this.paths;

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
        }, 1000);
      });
    });

    describe('when renaming a file during an amendment', function() {
      beforeEach('rename a file', function() {
        this.sandbox.stub(this.context, 'isAmendment').returns(true);
        this.sandbox.spy(fse, 'utimesSync');

        utils.execSync('git commit --allow-empty -m "Initial commit"');
        fse.ensureFileSync(this.paths['tracked-file']);
        utils.execSync('git add tracked-file');
        utils.execSync('git commit -m "Add file"');
        utils.execSync('git mv tracked-file renamed-file');
      });

      it('does not attempt to update the modification time of the non-existent file', function() {
        this.context.setupEnvironment();
        expect(fse.utimesSync).to.have.been.calledWithMatch(/renamed-file/);
        expect(fse.utimesSync).to.not.have.been.calledWithMatch(/tracked-file/);
      });
    });

    describe('when only a submodule change is staged', function() {
      beforeEach('setup submodule repo', function() {
        var submoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

        utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');
        utils.execSync('git commit -m "Add submodule"');

        fse.writeFileSync(path.join(this.repoPath, 'sub', 'submodule-file'), 'Hello World');
        utils.execSync('git submodule foreach "git add submodule-file" < /dev/null');
        utils.execSync('git submodule foreach "git config --local commit.gpgsign false"');
        utils.execSync('git submodule foreach "git commit -m \\"Another commit\\"" < /dev/null');
        utils.execSync('git add sub');

        utils.execSync('git config diff.submodule short');
      });

      it('keeps staged submodule change', function() {
        var diffBefore = utils.execSync('git diff --cached');
        expect(diffBefore).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);

        this.context.setupEnvironment();

        var diffAfter = utils.execSync('git diff --cached');
        expect(diffAfter).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);
        expect(diffBefore).to.equal(diffAfter);
      });
    });
  });

  describe('#cleanupEnvironment', function() {
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

        this.context.setupEnvironment();
      });

      it('restores unstaged changes', function() {
        this.context.cleanupEnvironment();

        expect(fse.readFileSync(this.paths['other-tracked-file'], 'utf8')).to.equal('Hello Other World\nSome more text');
      });

      it('keeps already-committed file', function() {
        this.context.cleanupEnvironment();

        expect(fse.readFileSync(this.paths['tracked-file'], 'utf8')).to.equal('Hello World');
      });

      it('keeps untracked files', function() {
        this.context.cleanupEnvironment();

        expect(fse.readFileSync(this.paths['untracked-file'], 'utf8')).to.equal('Hello Again');
      });

      it('keeps moodification times the same', function(done) {
        var modifiedTimes = {
          'tracked-file': fileUtils.modifiedTime(this.paths['tracked-file']),
          'other-tracked-file': fileUtils.modifiedTime(this.paths['other-tracked-file']),
          'untracked-file': fileUtils.modifiedTime(this.paths['untracked-file'])
        };

        var self = this;
        setTimeout(function () {
          self.context.cleanupEnvironment();

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
        fse.appendFileSync(this.paths['tracked-file'], '\nYet some more text');

        this.context.setupEnvironment();
      });

      it('restores the unstaged changes', function() {
        this.context.cleanupEnvironment();

        expect(fse.readFileSync(this.paths['tracked-file'], 'utf8')).to.equal('Hello World\nSome more text\nYet some more text');
      });

      it('keeps staged changes', function() {
        this.context.cleanupEnvironment();

        var showOutput = utils.execSync('git show :tracked-file');
        expect(showOutput).to.equal('Hello World\nSome more text');
      });

      it('keeps untracked files', function() {
        this.context.cleanupEnvironment();

        expect(fse.readFileSync(this.paths['untracked-file'], 'utf8')).to.equal('Hello Again');
      });

      it('keeps moodification times the same', function(done) {
        var paths = this.paths;

        var modifiedTimes = {
          'tracked-file': fileUtils.modifiedTime(paths['tracked-file']),
          'other-tracked-file': fileUtils.modifiedTime(paths['other-tracked-file']),
          'untracked-file': fileUtils.modifiedTime(paths['untracked-file'])
        };

        var self = this;
        setTimeout(function() {
          self.context.cleanupEnvironment();
          expect(fileUtils.modifiedTime(paths['tracked-file'])).to.equal(modifiedTimes['tracked-file']);
          expect(fileUtils.modifiedTime(paths['other-tracked-file'])).to.equal(modifiedTimes['other-tracked-file']);
          expect(fileUtils.modifiedTime(paths['untracked-file'])).to.equal(modifiedTimes['untracked-file']);
          done();
        }, 1000);
      });
    });

    describe('when there is a deleted file', function() {
      beforeEach('setup complex commit', function() {
        fse.writeFileSync(this.paths['tracked-file'], 'Hello World');

        utils.execSync('git add tracked-file');
        utils.execSync('git commit -m "Add tracked-file"');
        utils.execSync('git rm tracked-file');

        this.context.setupEnvironment();
      });

      it('deleted the file', function() {
        this.context.cleanupEnvironment();
        expect(fse.existsSync(this.paths['tracked-file'])).to.equal(false);
      });
    });

    describe('when only a submodule change was staged', function() {
      beforeEach('setup submodule repo', function() {
        var submoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

        utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');
        utils.execSync('git commit -m "Add submodule"');

        fse.writeFileSync(path.join(this.repoPath, 'sub', 'submodule-file'), 'Hello World');
        utils.execSync('git submodule foreach "git add submodule-file" < /dev/null');
        utils.execSync('git submodule foreach "git config --local commit.gpgsign false"');
        utils.execSync('git submodule foreach "git commit -m \\"Another commit\\"" < /dev/null');
        utils.execSync('git add sub');

        utils.execSync('git config diff.submodule short');

        this.context.setupEnvironment();
      });

      it('keeps staged submodule change', function() {
        var diffBefore = utils.execSync('git diff --cached');
        expect(diffBefore).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);

        this.context.cleanupEnvironment();

        var diffAfter = utils.execSync('git diff --cached');
        expect(diffAfter).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);
        expect(diffBefore).to.equal(diffAfter);
      });
    });

    describe('when submodule changes are staged along with other changes', function() {
      beforeEach('setup submodule repo', function() {
        var submoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

        utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');
        utils.execSync('git commit -m "Add submodule"');

        fse.writeFileSync(path.join(this.repoPath, 'sub', 'submodule-file'), 'Hello World');
        utils.execSync('git submodule foreach "git add submodule-file" < /dev/null');
        utils.execSync('git submodule foreach "git config --local commit.gpgsign false"');
        utils.execSync('git submodule foreach "git commit -m \\"Another commit\\"" < /dev/null');

        fse.writeFileSync(this.paths['tracked-file'], 'Hello Again');
        utils.execSync('git add sub tracked-file');

        utils.execSync('git config diff.submodule short');
        this.context.setupEnvironment();
      });

      it('keeps staged submodule change', function() {
        var diffBefore = utils.execSync('git diff --cached');
        expect(diffBefore).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);

        this.context.cleanupEnvironment();

        var diffAfter = utils.execSync('git diff --cached');
        expect(diffAfter).to.match(/-Subproject commit[\s\S]*\+Subproject commit/);
        expect(diffBefore).to.equal(diffAfter);
      });

      it('keeps staged file changes', function() {
        var showOutput = utils.execSync('git show :tracked-file');
        expect(showOutput).to.equal('Hello Again');
      });
    });

    describe('when a submodule removal was staged', function() {
      beforeEach('setup submodule repo', function() {
        var submoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

        utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');
        utils.execSync('git commit -m "Add submodule"');
        utils.execSync('git rm sub');

        this.context.setupEnvironment();
      });

      it('does not leave behind an empty submodule directory', function() {
        this.context.cleanupEnvironment();

        expect(fse.existsSync(path.join(this.repoPath, 'sub'))).to.equal(false);
      });
    });
  });
});
