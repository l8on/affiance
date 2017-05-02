'use strict';
const testHelper = require('../../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const EsLint = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookContextPreCommit = testHelper.requireSourceModule(module, 'lib/hook-context/pre-commit');

describe('EsLint', function() {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPreCommit(this.config, [], {});
    this.hook = new EsLint(this.config, this.context);

    this.result = {
      status: 0,
      stderr: '',
      stdout: ''
    };
    this.sandbox.stub(this.hook, 'spawnConcurrentCommandsOnApplicableFiles').returns(Promise.resolve(this.result));
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
      'file1.js: line 1, col 0, Warning - Missing "use strict" statement. (strict)',
      '',
      '1 problem'
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', 'file1.js: line 1, col 0, Warning - Missing "use strict" statement. (strict)');
      expect(hookResults[0]).to.have.property('file', 'file1.js');
      expect(hookResults[0]).to.have.property('line', 1);
      expect(hookResults[0]).to.have.property('type', 'warning');
    });
  });

  it('fails when there is an error in the output', function() {
    this.result.status = 1;
    this.result.stdout = [
      'file1.js: line 1, col 0, Error - Missing "use strict" statement. (strict)',
      '',
      '1 problem'
    ].join('\n');

    return this.hook.run().then((hookResults) => {
      expect(hookResults).to.have.length(1);
      expect(hookResults[0]).to.have.property('content', 'file1.js: line 1, col 0, Error - Missing "use strict" statement. (strict)');
      expect(hookResults[0]).to.have.property('file', 'file1.js');
      expect(hookResults[0]).to.have.property('line', 1);
      expect(hookResults[0]).to.have.property('type', 'error');
    });
  });
});
