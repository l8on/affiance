'use strict';
const testHelper = require('../../../../test_helper');
const fse = require('fs-extra');
const path = require('path');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const MergeConflicts = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');
const utils = testHelper.requireSourceModule(module, 'lib/utils');

describe('MergeConflicts', function () {
  beforeEach('setup hook context', function() {
    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);

    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new MergeConflicts(this.config, this.context);
    this.stagedFile = 'filename.txt';

    this.sandbox.stub(this.hook, 'command').returns('grep');
    this.sandbox.stub(this.hook, 'flags').returns(['-IHn', '^<<<<<<<[ \t]']);
    this.sandbox.stub(this.hook, 'applicableFiles');
  });

  afterEach('reset cwd on process', function() {
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
    this.sandbox.restore();
  });

  it('fails when the file contains a merge conflict marker', function() {
    let filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, 'Just\n<<<<<<< HEAD:filename.txt\nconflicting text');

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    return this.hook.run().then((hookResult) => {
      expect(hookResult).to.have.length(2);
      expect(hookResult[0]).to.equal('fail');
    });
  });

  it('passes when the file has no merge conflicts', function() {
    let filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, 'Just some text, yo');

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    return this.hook.run().then((hookResult) => {
      expect(hookResult).to.equal('pass');
    });
  });

  it('passes when the file almost has conflict markers', function() {
    let filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, 'Just some <<<<<<<<<<< arrows, yo');

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    return this.hook.run().then((hookResult) => {
      expect(hookResult).to.equal('pass');
    });
  });
});
