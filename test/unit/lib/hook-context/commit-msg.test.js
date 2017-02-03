var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextCommitMsg = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('HookContextBase', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(gitRepo, 'commentCharacter').returns('#');
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  describe('constructor', function() {
    beforeEach('setup hook context', function() {
      this.config = new Config({}, {validate: false});
      this.input = {};
      this.context = new HookContextCommitMsg(this.config, [], this.input);
    });

    it('sets hookScriptName to "commit-msg"', function() {
      expect(this.context.hookScriptName).to.equal('commit-msg');
    });

    it('sets hookConfigName to "CommitMsg"', function() {
      expect(this.context.hookConfigName).to.equal('CommitMsg');
    });
  });

  describe('#commitMessage', function() {
    beforeEach('setup hook context', function() {
      this.rawCommitMsgLines = [
        '# Please enter the commit message for your changes.',
        'Some commit message',
        '# On branch master',
        'diff --git a/file b/file',
        'index 4ae1030..342a117 100644',
        '--- a/file',
        '+++ b/file'
      ];
      this.commitMsgFileName = testHelper.tempFile('test-commit-msg', this.rawCommitMsgLines.join('\n'));

      this.config = new Config({}, {validate: false});
      this.input = {};
      this.context = new HookContextCommitMsg(this.config, [this.commitMsgFileName], this.input);
    });

    afterEach('cleanup file', function() {
      testHelper.cleanupFile(this.commitMsgFileName);
    });

    it('strips comments and trailing diff', function() {
      expect(this.context.commitMessage()).to.equal('Some commit message');
    });
  });

  describe('#isEmptyMessage', function() {
    describe('when the message is empty', function() {
      beforeEach('setup hook context', function() {
        this.commitMsgFileName = testHelper.tempFile('test-commit-msg', '');

        this.config = new Config({}, {validate: false});
        this.input = {};
        this.context = new HookContextCommitMsg(this.config, [this.commitMsgFileName], this.input);
      });

      afterEach('cleanup file', function() {
        testHelper.cleanupFile(this.commitMsgFileName);
      });

      it('returns true', function() {
        expect(this.context.isEmptyMessage()).to.equal(true);
      });
    });

    describe('when the message is all whitespace', function() {
      beforeEach('setup hook context', function() {
        this.commitMsgFileName = testHelper.tempFile('commit-msg', '    ');

        this.config = new Config({}, {validate: false});
        this.input = {};
        this.context = new HookContextCommitMsg(this.config, [this.commitMsgFileName], this.input);
      });

      afterEach('cleanup file', function() {
        testHelper.cleanupFile(this.commitMsgFileName);
      });

      it('returns true', function() {
        expect(this.context.isEmptyMessage()).to.equal(true);
      });
    });

    describe('when the message is not empty', function() {
      beforeEach('setup hook context', function() {
        this.commitMsgFileName = testHelper.tempFile('commit-msg', 'Some commit message');

        this.config = new Config({}, {validate: false});
        this.input = {};
        this.context = new HookContextCommitMsg(this.config, [this.commitMsgFileName], this.input);
      });

      afterEach('cleanup file', function() {
        testHelper.cleanupFile(this.commitMsgFileName);
      });

      it('returns true', function() {
        expect(this.context.isEmptyMessage()).to.equal(false);
      });
    });
  });
});
