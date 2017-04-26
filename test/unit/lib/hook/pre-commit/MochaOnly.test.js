var testHelper = require('../../../../test_helper');
var fse = require('fs-extra');
var path = require('path');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var MochaOnly = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');
var utils = testHelper.requireSourceModule(module, 'lib/utils');

describe('MochaOnly', function () {
  beforeEach('setup hook context', function() {
    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);

    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new MochaOnly(this.config, this.context);
    this.stagedFile = 'filename.txt';

    this.sandbox.stub(this.hook, 'command').returns('grep');
    this.sandbox.stub(this.hook, 'flags').returns(['-EIHn', '(it|describe)\.only']);
    this.sandbox.stub(this.hook, 'applicableFiles');
  });

  afterEach('reset cwd on process', function() {
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
    this.sandbox.restore();
  });

  it('fails when the file contains a specific test with a .only', function() {
    var filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, [
      "var helper = require('helper');",
      "describe('some test', function() {",
      "  it.only('does some stuff', function(done) {",
      '    expect(helper).to.have.been.called;',
      '  });',
      '});'
    ].join('\n'));

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    var hookResult = this.hook.run();
    expect(hookResult).to.have.length(2);
    expect(hookResult[0]).to.equal('fail');
  });

  it('fails when the file contains a specific describe with a .only', function() {
    var filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, [
      "var helper = require('helper');",
      "describe.only('some test', function() {",
      "  it('does some stuff', function(done) {",
      '    expect(helper).to.have.been.called;',
      '  });',
      '});'
    ].join('\n'));

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    var hookResult = this.hook.run();
    expect(hookResult).to.have.length(2);
    expect(hookResult[0]).to.equal('fail');
  });

  it('passes when the file contains an only in a test description', function() {
    var filePath = path.join(this.repoPath, this.stagedFile);
    fse.writeFileSync(filePath, [
      "var helper = require('helper');",
      "describe('some test', function() {",
      "  it('does only this thing', function(done) {",
      '    expect(helper).to.have.been.called;',
      '  });',
      '});'
    ].join('\n'));

    utils.execSync('git add ' + this.stagedFile);
    this.hook.applicableFiles.returns([filePath]);

    var hookResult = this.hook.run();
    expect(hookResult).to.equal('pass');
  });
});
