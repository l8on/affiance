var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var Installer = testHelper.requireSourceModule(module);

var fse = require('fs-extra');
var path = require('path');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var Logger = testHelper.requireSourceModule(module, 'lib/Logger');
var AffianceError = testHelper.requireSourceModule(module, 'lib/error');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

function areHookFilesInstalled(hooksDir) {
  if (!fse.existsSync(path.join(hooksDir, 'affiance-hook.js'))) {
    return false;
  }

  var masterHookPath = path.join(hooksDir, 'affiance-hook');
  if (!fse.existsSync(masterHookPath)) {
    return false;
  }

  var masterHookContent = fse.readFileSync(masterHookPath, 'utf8');
  for(var i in utils.supportedHookTypes) {
    var hookType = utils.supportedHookTypes[i];
    var hookFilePath = path.join(hooksDir, hookType);
    if (!fse.existsSync(hookFilePath) || fse.readFileSync(hookFilePath, 'utf8') !== masterHookContent) {
      return false;
    }
  }

  return true;
}

describe('Installer', function () {
  beforeEach('setup logger', function() {
    this.logger = new Logger({silent: false});
  });

  describe('#run', function() {
    beforeEach('setup options and installer', function() {
      this.options = {action: 'install'};
      this.installer = new Installer(this.logger, this.options);
    });

    it('raises an error if the target is not a directory', function() {
      var tempDir = testHelper.directory();
      var tempFileName = path.join(tempDir, 'some-file');
      fse.ensureFileSync(tempFileName);
      this.installer.options.target = tempFileName;

      var error = null;
      try {
        this.installer.run();
      } catch(e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error).to.have.property('affianceName', AffianceError.InvalidGitRepo);
      expect(error).to.have.property('message').that.matches(/not a directory/);
    });

    it('raises an error if the target is not a git repo', function() {
      var tempDir = testHelper.directory();
      this.installer.options.target = tempDir;

      var error = null;
      try {
        this.installer.run();
      } catch(e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error).to.have.property('affianceName', AffianceError.InvalidGitRepo);
      expect(error).to.have.property('message').that.matches(/git repo/);

      testHelper.cleanupDirectory(tempDir);
    });

    describe('when the target is a get repo', function() {
      beforeEach('setup git repo target', function() {
        gitRepo._repoRoot = null;
        gitRepo._gitDir = null;
        this.gitRepoPath = testHelper.tempRepo();
        this.installer.options.target = this.gitRepoPath;

        this.hooksDirPath = path.join(this.gitRepoPath, '.git', 'hooks');
        this.oldHooksDirPath = path.join(this.hooksDirPath, 'old-hooks');
        this.masterHookPath = path.join(this.hooksDirPath, 'affiance-hook');
        this.masterHookJsPath = path.join(this.hooksDirPath, 'affiance-hook.js');
      });

      afterEach('setup git repo target', function() {
        testHelper.cleanupDirectory(this.gitRepoPath);
      });

      describe('and an install is requested', function() {
        it('installs the master hooks and all supported hook files', function() {
          expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);

          this.installer.run();

          expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(true);
        });

        describe('but affiance hooks were previously installed', function() {
          beforeEach('install affiance', function() {
            this.installer.run();
          });

          it('maintains the installation', function() {
            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(true);
          });
        });

        describe('but unrelated hooks were previously installed', function() {
          beforeEach('add existing hook files', function() {
            fse.ensureDirSync(this.hooksDirPath);
            fse.ensureFileSync(path.join(this.hooksDirPath, 'commit-msg'));
            fse.ensureFileSync(path.join(this.hooksDirPath, 'pre-commit'));
          });

          it('moves them to the backup directory and installs', function() {
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'commit-msg'))).to.equal(false);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'pre-commit'))).to.equal(false);

            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(true);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'commit-msg'))).to.equal(true);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'pre-commit'))).to.equal(true);
          });

          it('does not move them to the backup directory if the force option is used', function() {
            this.installer.options.force = true;
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'commit-msg'))).to.equal(false);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'pre-commit'))).to.equal(false);

            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(true);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'commit-msg'))).to.equal(false);
            expect(fse.existsSync(path.join(this.oldHooksDirPath, 'pre-commit'))).to.equal(false);
          });
        });

        describe('and a repo configuration file is already present', function() {
            beforeEach('add repo config file', function() {
              this.existingContent = '# Hello World';
              this.repoConfigPath = path.join(this.gitRepoPath, '.affiance.yml');
              fse.writeFileSync(this.repoConfigPath, this.existingContent);
            });

            it('does not overwrite the existing configuration', function() {
              this.installer.run();

              expect(fse.readFileSync(this.repoConfigPath).toString()).to.equal(this.existingContent);
            });
        });

        describe('and a repo configuration file is not present', function() {
          beforeEach('add repo config file', function() {
            this.existingContent = '# Hello World';
            this.repoConfigPath = path.join(this.gitRepoPath, '.affiance.yml');
            fse.writeFileSync(this.repoConfigPath, this.existingContent);
          });

          it('creates the starter configuration', function() {
            this.installer.run();

            expect(fse.readFileSync(this.repoConfigPath).toString()).to.equal(this.existingContent);
          });
        });

        describe('and a repo configuration file is not present', function() {
          beforeEach('add repo config file', function() {
            this.starterPath = path.join(__dirname, '../../../../config/starter.yml');
            this.repoConfigPath = path.join(this.gitRepoPath, '.affiance.yml');
          });

          it('creates the starter configuration', function() {
            this.installer.run();

            var starterContent = fse.readFileSync(this.starterPath).toString();
            expect(fse.readFileSync(this.repoConfigPath).toString()).to.equal(starterContent);
          });
        });
      });

      describe('and an uninstall is requested', function() {
        beforeEach('setup uninstall options', function() {
          this.installer.options.action = 'uninstall';
        });

        describe('and Affiance hooks were previously installed', function() {
          beforeEach('setup uninstall options', function() {
            this.installer.options.action = 'install';
            this.installer.run();
            this.installer.options.action = 'uninstall';
          });

          it('removes the master hook and supported hook files', function() {
            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(true);

            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);
          });
        });

        describe('and Affiance hooks were not previously installed', function() {
          it('does not throw any errors', function() {
            this.installer.run();
          });
        });

        describe('and unrelated hooks were previously installed', function() {
          beforeEach('write some existing hooks to old hooks', function() {
            fse.ensureDirSync(this.oldHooksDirPath);
            fse.ensureFileSync(path.join(this.oldHooksDirPath, 'commit-msg'));
            fse.ensureFileSync(path.join(this.oldHooksDirPath, 'pre-commit'));
          });

          it('restores the previously existing hooks', function() {
            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);

            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);
            expect(fse.existsSync(path.join(this.hooksDirPath, 'commit-msg'))).to.equal(true);
            expect(fse.existsSync(path.join(this.hooksDirPath, 'pre-commit'))).to.equal(true);
          });
        });

        describe('and unrelated hooks are previously installed', function() {
          beforeEach('write some existing hooks to old hooks', function() {
            fse.ensureDirSync(this.hooksDirPath);
            fse.ensureFileSync(path.join(this.hooksDirPath, 'commit-msg'));
            fse.ensureFileSync(path.join(this.hooksDirPath, 'pre-commit'));
          });

          it('restores the previously existing hooks', function() {
            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);

            this.installer.run();

            expect(areHookFilesInstalled(this.hooksDirPath)).to.equal(false);
            expect(fse.existsSync(path.join(this.hooksDirPath, 'commit-msg'))).to.equal(true);
            expect(fse.existsSync(path.join(this.hooksDirPath, 'pre-commit'))).to.equal(true);
          });
        });

      });
    });
  });

});
