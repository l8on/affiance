var path = require('path');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPrePush = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPrePush', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.remoteName = 'origin';
    this.remoteUrl = 'git@github.com:l8on/affiance.git';
    this.argv = [this.remoteName, this.remoteUrl];
    this.input = {};
    this.context = new HookContextPrePush(this.config, this.argv, this.input);
  });

  afterEach('restore sandbox', function () {
    this.sandbox.restore();
  });

  describe('constructor', function () {
    it('sets hookScriptName to "pre-push"', function () {
      expect(this.context.hookScriptName).to.equal('pre-push');
    });

    it('sets hookConfigName to "PrePush"', function () {
      expect(this.context.hookConfigName).to.equal('PrePush');
    });
  });

  describe('#remoteName', function() {
    it('returns the remote name from the arguments', function() {
      expect(this.context.remoteName()).to.equal(this.remoteName);
    });
  });

  describe('#remoteUrl', function() {
    it('returns the remote name from the arguments', function() {
      expect(this.context.remoteUrl()).to.equal(this.remoteUrl);
    });
  });

  describe('#pushedRefs', function() {
    beforeEach('setup some refs', function() {
      this.localRef = 'refs/heads/master';
      this.localSha1 = testHelper.randomHash();
      this.remoteRef = 'refs/heads/master';
      this.remoteSha1 = testHelper.randomHash();

      this.sandbox.stub(this.context, 'inputLines').returns([
        [this.localRef, this.localSha1, this.remoteRef, this.remoteSha1].join(' ')
      ]);
    });

    it('parses the lines and returns an array of PushedRef instances', function() {
      var pushedRefs = this.context.pushedRefs();
      expect(pushedRefs).to.have.length(1);
      expect(pushedRefs[0]).to.have.property('localRef', this.localRef)
      expect(pushedRefs[0]).to.have.property('localSha1', this.localSha1)
      expect(pushedRefs[0]).to.have.property('remoteRef', this.remoteRef)
      expect(pushedRefs[0]).to.have.property('remoteSha1', this.remoteSha1)
    });
  });

  describe('.PushedRef', function() {
    beforeEach('set up a PushedRef', function() {
      this.localRef = 'refs/heads/master';
      this.localSha1 = testHelper.randomHash();
      this.remoteRef = 'refs/heads/master';
      this.remoteSha1 = testHelper.randomHash();

      this.pushedRef = new HookContextPrePush.PushedRef(this.localRef, this.localSha1, this.remoteRef, this.remoteSha1);
    });

    describe('#isForced', function() {
      it('returns false when the ref is created', function() {
        this.sandbox.stub(this.pushedRef, 'isCreated').returns(true);
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(false);

        expect(this.pushedRef.isForced()).to.equal(false);
      });

      it('returns false when the ref is deleted', function() {
        this.sandbox.stub(this.pushedRef, 'isCreated').returns(false);
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(true);

        expect(this.pushedRef.isForced()).to.equal(false);
      });

      it('returns false remote commits are not overwritten', function() {
        this.sandbox.stub(this.pushedRef, 'isCreated').returns(false);
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(false);
        this.sandbox.stub(this.pushedRef, 'overwrittenCommits').returns([]);

        expect(this.pushedRef.isForced()).to.equal(false);
      });

      it('returns true remote commits are overwritten', function() {
        this.sandbox.stub(this.pushedRef, 'isCreated').returns(false);
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(false);
        this.sandbox.stub(this.pushedRef, 'overwrittenCommits').returns([testHelper.randomHash()]);

        expect(this.pushedRef.isForced()).to.equal(true);
      });
    });

    describe('#isCreated', function() {
      it('returns true when creating a ref', function() {
        this.pushedRef.remoteSha1 = '0'.repeat(40);

        expect(this.pushedRef.isCreated()).to.equal(true);
      });

      it('returns false when not creating a ref', function() {
        this.pushedRef.remoteSha1 = testHelper.randomHash();

        expect(this.pushedRef.isCreated()).to.equal(false);
      });
    });

    describe('#isDeleted', function() {
      it('returns true when deleting a ref', function() {
        this.pushedRef.localSha1 = '0'.repeat(40);

        expect(this.pushedRef.isDeleted()).to.equal(true);
      });

      it('returns false when not creating a ref', function() {
        this.pushedRef.localSha1 = testHelper.randomHash();

        expect(this.pushedRef.isDeleted()).to.equal(false);
      });
    });

    describe('#isDestructive', function() {
      it('returns true when deleting a ref', function() {
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(true);

        expect(this.pushedRef.isDestructive()).to.equal(true);
      });

      it('returns true when force pushing a ref', function() {
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(false);
        this.sandbox.stub(this.pushedRef, 'isForced').returns(true);

        expect(this.pushedRef.isDestructive()).to.equal(true);
      });

      it('returns false when neither deleting nor forcing', function() {
        this.sandbox.stub(this.pushedRef, 'isDeleted').returns(false);
        this.sandbox.stub(this.pushedRef, 'isForced').returns(false);

        expect(this.pushedRef.isDestructive()).to.equal(false);
      });
    });
  });
});
