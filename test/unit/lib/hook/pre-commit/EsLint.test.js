var testHelper = require('../../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var EsLint = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('EsLint', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new EsLint(this.config, this.context);

    this.result = {
      status: 0,
      stdout: ''
    };
    this.sandbox.stub(this.hook, 'execute').returns(this.result);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when there are no messages output', function() {
    this.result.stdout = '';
    expect(this.hook.run()).to.equal('pass');
  });

  it('warns when there are messages output', function() {
    this.result.stdout = [
      'file1.js: line 1, col 0, Warning - Missing "use strict" statement. (strict)',
      '',
      '1 problem'
    ].join('\n');

    var hookResults = this.hook.run();

    expect(hookResults).to.have.length(1);
    expect(hookResults[0]).to.have.property('content', 'file1.js: line 1, col 0, Warning - Missing "use strict" statement. (strict)');
    expect(hookResults[0]).to.have.property('file', 'file1.js');
    expect(hookResults[0]).to.have.property('line', 1);
    expect(hookResults[0]).to.have.property('type', 'warning');
  });

  it('fails when there is an error in the output', function() {
    this.result.status = 1;
    this.result.stdout = [
      'file1.js: line 1, col 0, Error - Missing "use strict" statement. (strict)',
      '',
      '1 problem'
    ].join('\n');

    var hookResults = this.hook.run();

    expect(hookResults).to.have.length(1);
    expect(hookResults[0]).to.have.property('content', 'file1.js: line 1, col 0, Error - Missing "use strict" statement. (strict)');
    expect(hookResults[0]).to.have.property('file', 'file1.js');
    expect(hookResults[0]).to.have.property('line', 1);
    expect(hookResults[0]).to.have.property('type', 'error');
  });
});
