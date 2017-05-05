'use strict';
const testHelper = require('../../../../test_helper');
const sinon = testHelper.sinon;
const Mocha = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPrePush = testHelper.requireSourceModule(module, 'lib/hook-context/pre-push');

describe('Mocha', function () {
  beforeEach('setup hook context', function() {
    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);

    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPrePush(this.config, [], {});
    this.hook = new Mocha(this.config, this.context);
  });

  afterEach('reset cwd on process', function() {
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
    this.sandbox.restore();
  });

  it('runs the mocha test suite against the repo');
});
