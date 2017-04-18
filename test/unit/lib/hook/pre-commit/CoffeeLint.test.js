var testHelper = require('../../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var CoffeeLint = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('CoffeeLint', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new CoffeeLint(this.config, this.context);

    this.result = {
      stdout: ''
    };
    this.sandbox.stub(this.hook, 'execute').returns(this.result);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when there are no messages output', function() {
    this.result.stdout = 'path,lineNumber,lineNumberEnd,level,message';
    expect(this.hook.run()).to.deep.equal([]);
  });

  it('warns when there are messages output', function() {
    this.result.stdout = [
      'path,lineNumber,lineNumberEnd,level,message',
      'file1.coffee,31,,warn,Comprehensions must have parentheses around them',
      ''
    ].join('\n');

    var hookResults = this.hook.run();

    expect(hookResults).to.have.length(1);
    expect(hookResults[0]).to.have.property('content', 'Comprehensions must have parentheses around them');
    expect(hookResults[0]).to.have.property('file', 'file1.coffee');
    expect(hookResults[0]).to.have.property('line', 31);
    expect(hookResults[0]).to.have.property('type', 'warning');
  });

  it('fails when there is an error in the output', function() {
    this.result.stdout = [
      'path,lineNumber,lineNumberEnd,level,message',
      'file1.coffee,17,,error,Duplicate key defined in object or class',
      ''
    ].join('\n');

    var hookResults = this.hook.run();

    expect(hookResults).to.have.length(1);
    expect(hookResults[0]).to.have.property('content', 'Duplicate key defined in object or class');
    expect(hookResults[0]).to.have.property('file', 'file1.coffee');
    expect(hookResults[0]).to.have.property('line', 17);
    expect(hookResults[0]).to.have.property('type', 'error');
  });
});
