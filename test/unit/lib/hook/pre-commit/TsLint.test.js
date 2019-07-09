'use strict';
const testHelper = require('../../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const TsLint = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');

describe('TsLint', function() {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new TsLint(this.config, this.context);

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
      "Warning: The 'deprecation' rule requires type information.",
      "WARNING: relative/path.ts:15:35 - Type declaration of 'any' loses type-safety.",
      ''
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', 'WARNING: relative/path.ts:15:35 - Type declaration of \'any\' loses type-safety.');
      expect(hookResults[0]).to.have.property('file', 'relative/path.ts');
      expect(hookResults[0]).to.have.property('line', 15);
      expect(hookResults[0]).to.have.property('type', 'warning');
    });
  });

  it('fails when there is an error in the output', function() {
    this.result.status = 1;
    this.result.stdout = [
      "Warning: The 'deprecation' rule requires type information.",
      'ERROR: relative/path.ts:16:12 - Missing semicolon',
      ''
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', 'ERROR: relative/path.ts:16:12 - Missing semicolon');
      expect(hookResults[0]).to.have.property('file', 'relative/path.ts');
      expect(hookResults[0]).to.have.property('line', 16);
      expect(hookResults[0]).to.have.property('type', 'error');
    });
  });
});
