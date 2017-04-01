var testHelper = require('../../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var CapitalizedSubject = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextCommitMsg = testHelper.requireSourceModule(module, 'lib/hook-context/commit-msg');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('CapitalizedSubject', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextCommitMsg(this.config, [], {});
    this.hook = new CapitalizedSubject(this.config, this.context);

    // Stub context functions that provide commit message information
    this.sandbox.stub(this.context, 'commitMessageLines').returns([]);
    this.sandbox.stub(this.context, 'isEmptyMessage').returns(true);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  it('passes when the commit message is empty', function() {
     this.context.commitMessageLines.returns(['']);
     expect(this.hook.run()).to.equal('pass');
  });

  describe('when the message is not empty', function() {
    beforeEach('setup stubs', function() {
      this.context.isEmptyMessage.returns(false);
    });

    it('passes when the subject starts with a capital letter', function() {
      this.context.commitMessageLines.returns([
        'Initial commit',
        '',
        'Mostly cats so far'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });

    it('passes when the subject starts with a special capital letter', function() {
      this.context.commitMessageLines.returns([
        'Årsgång',
        '',
        'Mostly cats so far'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });

    it('passes when the subject starts with quotes and a capital letter', function() {
      this.context.commitMessageLines.returns([
        '"Initial commit"',
        '',
        'Mostly cats so far'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });

    it('warns when the subject starts with quotes and a lowercase letter', function() {
      this.context.commitMessageLines.returns([
        'initial commit',
        '',
        'I forget about commit message standards and decide to not capitalize my',
        'subject. Still mostly cats so far.'
      ]);
      expect(this.hook.run()).to.deep.equal(['warn','Subject should start with a capital letter']);
    });

    it('warns when the subject starts with quotes and a lowercase special character', function() {
      this.context.commitMessageLines.returns([
        'årsgång',
        '',
        'I forget about commit message standards and decide to not capitalize my',
        'subject. Still mostly cats so far.'
      ]);
      expect(this.hook.run()).to.deep.equal(['warn','Subject should start with a capital letter']);
    });

    it('warns when the subject starts with quotes and a lowercase letter', function() {
      this.context.commitMessageLines.returns([
        '"initial commit"',
        '',
        'Mostly cats so far'
      ]);
      expect(this.hook.run()).to.deep.equal(['warn','Subject should start with a capital letter']);
    });

    it('passes when the subject starts with the special "fixup!" prefix', function() {
      this.context.commitMessageLines.returns([
        'fixup! commit',
        '',
        'This was created by running git commit --fixup=...'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });

    it('passes when the subject starts with the special "squash!" prefix', function() {
      this.context.commitMessageLines.returns([
        'squash! commit',
        '',
        'This was created by running git commit --squash=...'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });

    it('passes when the first line of the commit is empty', function() {
      this.context.commitMessageLines.returns([
        '',
        'There was no first line',
        '',
        'This is a mistake.'
      ]);
      expect(this.hook.run()).to.equal('pass');
    });
  });
});
