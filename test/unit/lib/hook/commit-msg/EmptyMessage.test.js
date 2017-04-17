var testHelper = require('../../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var CapitalizedSubject = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextEmptyMessage = testHelper.requireSourceModule(module, 'lib/hook-context/commit-msg');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('CapitalizedSubject', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextEmptyMessage(this.config, [], {});
    this.hook = new CapitalizedSubject(this.config, this.context);

    // Stub context functions that provide commit message information
    this.sandbox.stub(this.context, 'commitMessage');
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when the commit message is not empty', function() {
    this.context.commitMessage.returns('Some stuff in the commit message');
    expect(this.hook.run()).to.equal('pass');
  });

  it('fails when the commit message is empty', function() {
    this.context.commitMessage.returns('');
    expect(this.hook.run()).to.deep.equal(['fail', 'Commit message should not be empty']);
  });

  it('fails when the commit message is only empty space', function() {
    this.context.commitMessage.returns(' \n ');
    expect(this.hook.run()).to.deep.equal(['fail', 'Commit message should not be empty']);
  });
});
