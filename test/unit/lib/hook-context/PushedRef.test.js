'use strict';
const testHelper = require('../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const PushedRef = testHelper.requireSourceModule(module);

describe('.PushedRef', function() {
  beforeEach('set up a PushedRef', function() {
    this.sandbox = sinon.sandbox.create();
    this.localRef = 'refs/heads/master';
    this.localSha1 = testHelper.randomHash();
    this.remoteRef = 'refs/heads/master';
    this.remoteSha1 = testHelper.randomHash();

    this.pushedRef = new PushedRef(this.localRef, this.localSha1, this.remoteRef, this.remoteSha1);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
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
