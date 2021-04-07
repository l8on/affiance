'use strict';
const testHelper = require('../../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const Spectral = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');

describe('Spectral', function() {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new Spectral(this.config, this.context);

    this.result = {
      status: 0,
      stderr: '',
      stdout: ''
    };
    this.sandbox.stub(this.hook, 'spawnPromiseOnApplicableFiles').returns(Promise.resolve(this.result));
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when there are no messages output', function() {
    this.result.stdout = '';

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.equal('pass');
    });
  });

  it('warns when there are messages output', function() {
    this.result.stdout = [
      '/path/to/file.js:10:2 warning rule-name "This is a warning message"'
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', '/path/to/file.js:10:2 warning rule-name "This is a warning message"');
      expect(hookResults[0]).to.have.property('file', '/path/to/file.js');
      expect(hookResults[0]).to.have.property('line', 10);
      expect(hookResults[0]).to.have.property('type', 'warning');
    });
  });

  it('fails when there is an error in the output', function() {
    this.result.status = 1;
    this.result.stdout = [
      '/path/to/file.js:20:2 error rule-name "This is an error message"'
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', '/path/to/file.js:20:2 error rule-name "This is an error message"');
      expect(hookResults[0]).to.have.property('file', '/path/to/file.js');
      expect(hookResults[0]).to.have.property('line', 20);
      expect(hookResults[0]).to.have.property('type', 'error');
    });
  });
});
