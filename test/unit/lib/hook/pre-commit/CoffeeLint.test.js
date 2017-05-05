'use strict';
const testHelper = require('../../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const CoffeeLint = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');

describe('CoffeeLint', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new CoffeeLint(this.config, this.context);

    this.result = {
      status: 0,
      signal: null,
      stderr: '',
      stdout: ''
    };
    this.sandbox.stub(this.hook, 'spawnPromiseOnApplicableFiles').returns(Promise.resolve(this.result));
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when there are no messages output', function() {
    this.result.stdout = 'path,lineNumber,lineNumberEnd,level,message';
    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.deep.equal([]);
    });
  });

  it('warns when there are messages output', function() {
    this.result.stdout = [
      'path,lineNumber,lineNumberEnd,level,message',
      'file1.coffee,31,,warn,Comprehensions must have parentheses around them',
      ''
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      let hookResult = hookResults[0];
      expect(hookResult).to.have.property('content', 'file1.coffee,31,,warn,Comprehensions must have parentheses around them');
      expect(hookResult).to.have.property('file', 'file1.coffee');
      expect(hookResult).to.have.property('line', 31);
      expect(hookResult).to.have.property('type', 'warning');
    });
  });

  it('fails when there is an error in the output', function() {
    this.result.stdout = [
      'path,lineNumber,lineNumberEnd,level,message',
      'file1.coffee,17,,error,Duplicate key defined in object or class',
      ''
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', 'file1.coffee,17,,error,Duplicate key defined in object or class');
      expect(hookResults[0]).to.have.property('file', 'file1.coffee');
      expect(hookResults[0]).to.have.property('line', 17);
      expect(hookResults[0]).to.have.property('type', 'error');
    });
  });
});
