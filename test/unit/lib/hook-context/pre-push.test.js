'use strict';
const testHelper = require('../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const HookContextPrePush = testHelper.requireSourceModule(module);
const Config = testHelper.requireSourceModule(module, 'lib/config');

describe('HookContextPrePush', function() {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.remoteName = 'origin';
    this.remoteUrl = 'git@github.com:l8on/affiance.git';
    this.argv = [this.remoteName, this.remoteUrl];
    this.input = {};
    this.context = new HookContextPrePush(this.config, this.argv, this.input);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  describe('constructor', function() {
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
      let pushedRefs = this.context.pushedRefs();
      expect(pushedRefs).to.have.length(1);
      expect(pushedRefs[0]).to.have.property('localRef', this.localRef);
      expect(pushedRefs[0]).to.have.property('localSha1', this.localSha1);
      expect(pushedRefs[0]).to.have.property('remoteRef', this.remoteRef);
      expect(pushedRefs[0]).to.have.property('remoteSha1', this.remoteSha1);
    });
  });
});
