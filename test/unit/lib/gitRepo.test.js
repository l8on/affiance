var testHelper = require('../../test_helper');
var fse = require('fs-extra');
var path = require('path');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var gitRepo = testHelper.requireSourceModule(module);
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('gitRepo', function() {
  beforeEach('create git repo', function() {
    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);
  });

  afterEach('reset cwd on process', function() {
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
  });

  describe('.submoduleStatuses', function() {
    it('returns an empty array when there are no submodules', function() {
      var submoduleStatuses = gitRepo.submoduleStatuses();
      expect(submoduleStatuses).to.be.an('Array');
      expect(submoduleStatuses).to.be.empty
    });

    describe('when the repo contains submodules', function() {
      beforeEach('setup nested submodules', function() {
        // Create the repo that will be the nested submodule.
        this.nestedSubmoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: this.nestedSubmoduleRepo});

        // Create the repo that will be the direct submodule.
        this.submoduleRepo = testHelper.tempRepo();
        utils.execSync(
          'git submodule add ' + this.nestedSubmoduleRepo + ' nested-sub 2>&1 > /dev/null',
          {cwd: this.submoduleRepo}
        );
        utils.execSync('git commit -m "Add nested submodule"', {cwd: this.submoduleRepo});

        // Add the direct submodule to the main test repo.
        utils.execSync('git submodule add ' + this.submoduleRepo + ' sub 2>&1 > /dev/null');
      });

      afterEach('setup nested submodules', function() {
        testHelper.cleanupDirectory(this.nestedSubmoduleRepo);
        testHelper.cleanupDirectory(this.submoduleRepo);
      });

      it('returns submodule statuses for this repo', function() {
        var submoduleStatuses = gitRepo.submoduleStatuses();
        expect(submoduleStatuses).to.have.length(1);
        expect(submoduleStatuses[0]).to.have.property('path', 'sub');
      });

      it('includes nested submodules if the recursive flag is provided', function() {
        var submoduleStatuses = gitRepo.submoduleStatuses({recursive: true});
        expect(submoduleStatuses).to.have.length(2);
        expect(submoduleStatuses[0]).to.have.property('path', 'sub');
        expect(submoduleStatuses[1]).to.have.property('path', 'sub/nested-sub');
      });
    });
  });

  describe('.extractModifiedLines', function() {
    beforeEach('setup file', function() {
      this.fileName = 'file.txt';
      this.fileContent = "Hello World\nHow are you?\n";
      fse.writeFileSync(this.fileName, this.fileContent);

      utils.execSync('git add ' + this.fileName);
      utils.execSync('git commit -m "Initial commit"');
    });

    it('returns an empty array when no lines are modified', function() {
      var modifiedLines = gitRepo.extractModifiedLines(this.fileName);
      expect(modifiedLines).to.be.an('Array');
      expect(modifiedLines).to.be.empty
    });

    it('returns the last line if a line is added', function() {
      var nextLine = 'Hello Again\n';
      fse.appendFileSync(this.fileName, nextLine);

      var modifiedLines = gitRepo.extractModifiedLines(this.fileName);
      expect(modifiedLines).to.be.an('Array');
      expect(modifiedLines).to.have.length(1);
      expect(modifiedLines[0]).to.equal('3');
    });

    it('returns an existing line if changed string', function() {
      fse.writeFileSync(this.fileName, "Hello World\nWho are you?\n");

      var modifiedLines = gitRepo.extractModifiedLines(this.fileName);
      expect(modifiedLines).to.be.an('Array');
      expect(modifiedLines).to.have.length(1);
      expect(modifiedLines[0]).to.equal('2');
    });

    it('returns an empty string if lines removed', function() {
      fse.writeFileSync(this.fileName, "Hello World\n");

      var modifiedLines = gitRepo.extractModifiedLines(this.fileName);
      expect(modifiedLines).to.be.an('Array');
      expect(modifiedLines).to.be.empty
    });
  });

  describe('.modifiedFiles', function() {
    describe('when the staged option is set', function() {
      beforeEach('set options', function(){
        this.options = {staged: true};
      });

      it('returns files that are added', function() {
        fse.ensureFileSync('added.txt');
        utils.execSync('git add added.txt');

        var modifiedFiles = gitRepo.modifiedFiles(this.options);
        expect(modifiedFiles).to.be.an('Array');
        expect(modifiedFiles).to.have.length(1);
        expect(modifiedFiles[0]).to.include('added.txt');
      });

      it('returns files that are renamed', function() {
        fse.ensureFileSync('file.txt');
        utils.execSync('git add file.txt');
        utils.execSync('git commit -m "Initial commit"');
        utils.execSync('git mv file.txt renamed.txt');

        var modifiedFiles = gitRepo.modifiedFiles(this.options);
        expect(modifiedFiles).to.be.an('Array');
        expect(modifiedFiles).to.have.length(1);
        expect(modifiedFiles[0]).to.include('renamed.txt');
      });

      it('returns files that are modified', function() {
        fse.ensureFileSync('file.txt');
        utils.execSync('git add file.txt');
        utils.execSync('git commit -m "Initial commit"');
        fse.appendFileSync('file.txt', "Moar text.\n");
        utils.execSync('git add file.txt');

        var modifiedFiles = gitRepo.modifiedFiles(this.options);
        expect(modifiedFiles).to.be.an('Array');
        expect(modifiedFiles).to.have.length(1);
        expect(modifiedFiles[0]).to.include('file.txt');
      });

      it('does not include deleted files', function() {
        fse.ensureFileSync('file.txt');
        utils.execSync('git add file.txt');
        utils.execSync('git commit -m "Initial commit"');
        utils.execSync('git rm file.txt');

        var modifiedFiles = gitRepo.modifiedFiles(this.options);
        expect(modifiedFiles).to.be.an('Array');
        expect(modifiedFiles).to.be.empty;
      });

      it('does not include submodule name', function() {
        var submoduleRepo = testHelper.tempRepo();
        utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

        utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');

        var modifiedFiles = gitRepo.modifiedFiles(this.options);
        expect(modifiedFiles).to.be.an('Array');
        expect(modifiedFiles).to.have.length(1);
        expect(modifiedFiles[0]).to.not.include('sub');

        testHelper.cleanupDirectory(submoduleRepo);
      });
    });
  });

  describe('.listFiles', function() {
    beforeEach('add initial commit to repo', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
    });

    it('does not include submodules', function() {
      var submoduleRepo = testHelper.tempRepo();
      utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: submoduleRepo});

      utils.execSync('git submodule add ' + submoduleRepo + ' sub 2>&1 > /dev/null');
      utils.execSync('git commit -m "Add submodule"');

      var listFiles = gitRepo.listFiles();
      expect(listFiles).to.be.an('Array');
      expect(listFiles).to.have.length(1);
      expect(listFiles[0]).to.not.include('sub');

      testHelper.cleanupDirectory(submoduleRepo);
    });

    describe('when listing the contents of a directory', function() {
      beforeEach('setup the directory', function() {
        this.dirName = 'some-dir';
        this.paths = [this.dirName + path.sep];
        fse.ensureDirSync(this.dirName);
      });

      it('returns an empty array if the directory is empty', function() {
        var listFiles = gitRepo.listFiles(this.paths);
        expect(listFiles).to.be.an('Array');
        expect(listFiles).to.be.empty;
      });

      it('returns files in the directory', function() {
        var fileName = this.dirName + '/file.txt';
        fse.ensureFileSync(fileName);
        utils.execSync('git add ' + fileName);
        utils.execSync('git commit -m "Add file"');

        var listFiles = gitRepo.listFiles(this.paths);
        expect(listFiles).to.be.an('Array');
        expect(listFiles).to.have.length(1);
        expect(listFiles[0]).to.equal(path.resolve(fileName));
      });
    });
  });

  describe('.isTracked', function() {
    beforeEach('setup tracked and untracked file', function() {
      fse.ensureFileSync('untracked');
      fse.ensureFileSync('tracked');
      utils.execSync('git add tracked');
      utils.execSync('git commit -m "Initial commit"');

      fse.ensureFileSync('staged');
      utils.execSync('git add staged');
    });

    it('returns false for untracked files', function() {
      expect(gitRepo.isTracked('untracked')).to.equal(false);
    });

    it('returns true for committed files', function() {
      expect(gitRepo.isTracked('tracked')).to.equal(true);
    });

    it('returns true for staged files', function() {
      expect(gitRepo.isTracked('staged')).to.equal(true);
    });
  });

  describe('.allFiles', function() {
    beforeEach('setup repo with files and a submodule', function() {
      fse.ensureFileSync('untracked');
      fse.ensureFileSync('tracked');
      utils.execSync('git add tracked');
      utils.execSync('git commit -m "Initial commit"');

      this.submoduleRepo = testHelper.tempRepo();
      utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: this.submoduleRepo});

      utils.execSync('git submodule add ' + this.submoduleRepo + ' sub 2>&1 > /dev/null');
      utils.execSync('git commit -m "Add submodule"');

      fse.ensureFileSync('staged');
      utils.execSync('git add staged');
    });

    afterEach('clean up submodule repo', function() {
      if (this.submoduleRepo) {
        testHelper.cleanupDirectory(this.submoduleRepo);
      }
    });

    it('includes tracked and staged files', function() {
      var allFiles = gitRepo.allFiles();
      expect(allFiles).to.have.length(3);
      expect(allFiles).to.include(path.resolve('staged'));
      expect(allFiles).to.include(path.resolve('tracked'));
      expect(allFiles).to.include(path.resolve('.gitmodules'));
      expect(allFiles).to.not.include(path.resolve('sub'));
    });
  });

  describe('.isInitialCommit', function() {
    it('returns true if there are no existing commits in the repo', function() {
      expect(gitRepo.isInitialCommit()).to.equal(true);
    });

    it('returns true if there are no existing commits in the repo', function() {
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      expect(gitRepo.isInitialCommit()).to.equal(false);
    });
  });

  describe('.stagedSubmoduleRemovals', function() {
    beforeEach('setup submodules', function() {
      // Create the repo that will be the direct submodule.
      this.submoduleRepo = testHelper.tempRepo();
      utils.execSync('git commit --allow-empty -m "Initial commit"', {cwd: this.submoduleRepo});

      // Add the direct submodule to the main test repo.
      utils.execSync('git submodule add ' + this.submoduleRepo + ' sub-repo 2>&1 > /dev/null');
      utils.execSync('git commit -m "Initial commit"');
    });

    afterEach('cleanup nested submodules', function() {
      testHelper.cleanupDirectory(this.submoduleRepo);
    });

    it('returns an empty array when no submodules are being removed', function() {
      var stagedSubmoduleRemovals = gitRepo.stagedSubmoduleRemovals();
      expect(stagedSubmoduleRemovals).to.be.an('Array');
      expect(stagedSubmoduleRemovals).to.be.empty;
    });

    it('returns an empty array only additions are staged', function() {
      var additionalSubmoduleRepo = testHelper.tempRepo();
      utils.execSync('git commit --allow-empty -m "Another submodule"', {cwd: additionalSubmoduleRepo});
      utils.execSync('git submodule add ' + additionalSubmoduleRepo + ' another-sub-repo 2>&1 > /dev/null');

      var stagedSubmoduleRemovals = gitRepo.stagedSubmoduleRemovals();
      expect(stagedSubmoduleRemovals).to.be.an('Array');
      expect(stagedSubmoduleRemovals).to.be.empty;

      testHelper.cleanupDirectory(additionalSubmoduleRepo);
    });

    it('returns submodules that are staged for removal', function() {
      utils.execSync('git rm sub-repo');
      var stagedSubmoduleRemovals = gitRepo.stagedSubmoduleRemovals();
      expect(stagedSubmoduleRemovals).to.be.an('Array');
      expect(stagedSubmoduleRemovals).to.have.length(1);
      expect(stagedSubmoduleRemovals[0]).to.have.property('path', 'sub-repo');
      expect(fileUtils.isDirectory(stagedSubmoduleRemovals[0].url)).to.equal(true);
    });
  });

  describe('.branchesContainingCommit', function() {
    beforeEach('setup topic branch', function() {
      utils.execSync('git checkout -b master > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Initial commit"');
      utils.execSync('git checkout -b topic > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Topical commit"');
    });

    it('returns the branch if the branch name is used', function() {
      var branchesContainingCommit = gitRepo.branchesContainingCommit('topic');
      expect(branchesContainingCommit).to.have.length(1);
      expect(branchesContainingCommit[0]).to.equal('topic');
    });

    it('returns the all branches that contain a ref', function() {
      var branchesContainingCommit = gitRepo.branchesContainingCommit('master');
      expect(branchesContainingCommit).to.have.length(2);
      expect(branchesContainingCommit).to.include('master');
      expect(branchesContainingCommit).to.include('topic');
    });

    it('returns an empty array if not branches currently contain the commit', function() {
      utils.execSync('git checkout --detach > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Detached HEAD"');

      var branchesContainingCommit = gitRepo.branchesContainingCommit('HEAD');
      expect(branchesContainingCommit).to.be.an('Array');
      expect(branchesContainingCommit).to.be.empty;
    });
  });
});
