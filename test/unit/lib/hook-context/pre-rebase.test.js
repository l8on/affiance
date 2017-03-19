var path = require('path');
var testHelper = require('../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var HookContextPreRebase = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');
var utils = testHelper.requireSourceModule(module, 'lib/utils');
var fileUtils = testHelper.requireSourceModule(module, 'lib/fileUtils');

describe('HookContextPreRebase', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({}, {validate: false});
    this.upstreamBranch = 'master';
    this.rebasedBranch = 'topic';
    this.argv = [this.upstreamBranch, this.rebasedBranch];
    this.input = {};
    this.context = new HookContextPreRebase(this.config, this.argv, this.input);

    this.oldCwd = process.cwd();
    this.repoPath = testHelper.tempRepo();
    process.chdir(this.repoPath);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
    if(!this.oldCwd) { return; }

    process.chdir(this.oldCwd);
    testHelper.cleanupDirectory(this.repoPath);
  });

  describe('constructor', function() {
    it('sets hookScriptName to "pre-rebase"', function() {
      expect(this.context.hookScriptName).to.equal('pre-rebase');
    });

    it('sets hookConfigName to "PreRebase"', function() {
      expect(this.context.hookConfigName).to.equal('PreRebase');
    });
  });

  describe('#upstreamBranch', function() {
    it('returns the first argument', function() {
      expect(this.context.upstreamBranch()).to.equal(this.upstreamBranch);
    });
  });

  describe('#rebased_branch', function() {
    it('returns the second argument when provided', function() {
      expect(this.context.rebasedBranch()).to.equal(this.rebasedBranch);
    });

    describe('when rebasing current branch', function() {
      beforeEach('setup rebase stuff', function() {
        this.context.argv[1] = null;
        utils.execSync('git checkout -b master > /dev/null 2>&1');
      });

      it('returns the current branch name', function() {
        expect(this.context.rebasedBranch()).to.equal('master');
      });
    });
  });

  describe('#isFastForward', function() {
    it('returns true when the upstream branch is descendent from rebased branch', function() {
      this.sandbox.stub(this.context, 'rebasedCommits').returns([]);

      expect(this.context.isFastForward()).to.equal(true);
    });

    it('returns false when the upstream branch is not descendent from rebased branch', function() {
      this.sandbox.stub(this.context, 'rebasedCommits').returns([testHelper.randomHash()]);

      expect(this.context.isFastForward()).to.equal(false);
    });
  });

  describe('#isDetachedHead', function() {
    it('returns true when rebasing a detached HEAD', function() {
      this.sandbox.stub(this.context, 'rebasedBranch').returns('');

      expect(this.context.isDetachedHead()).to.equal(true);
    });

    it('returns false when rebasing a branch', function() {
      this.sandbox.stub(this.context, 'rebasedBranch').returns('topic');

      expect(this.context.isDetachedHead()).to.equal(false);
    });
  });

  describe('#rebasedCommits', function() {
    beforeEach('setup some commits on branches', function() {
      this.baseBranch = 'master';
      this.topicBranch1 = 'topic-1';
      this.topicBranch2 = 'topic-2';

      utils.execSync('git checkout -b ' + this.baseBranch + ' > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Initial Commit"');
      utils.execSync('git checkout -b ' + this.topicBranch1 + ' > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Hello World"');
      utils.execSync('git checkout -b ' + this.topicBranch2 + ' > /dev/null 2>&1');
      utils.execSync('git commit --allow-empty -m "Hello Again"');
    });

    it('returns an empty list when upstream is descendent from rebased branch', function() {
      this.context.argv = [this.topicBranch1, this.baseBranch];

      expect(this.context.rebasedCommits()).to.be.empty
    });

    it('returns an empty list when upstream is not descendent from rebased branch', function() {
      this.context.argv = [this.topicBranch1, this.topicBranch2];

      expect(this.context.rebasedCommits()).to.have.length(1);
    });
  });
});
