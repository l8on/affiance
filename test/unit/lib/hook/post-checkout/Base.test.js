var testHelper = require('../../../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var PostCheckoutBase = testHelper.requireSourceModule(module);
var Config = testHelper.requireSourceModule(module, 'lib/config');
var HookContextPostCheckout = testHelper.requireSourceModule(module, 'lib/hook-context/post-checkout');
var gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('PostCheckoutBase', function () {
  beforeEach('setup hook context', function() {
    this.sandbox = sinon.sandbox.create();
    this.config = new Config({});
    this.context = new HookContextPostCheckout(this.config, [], {});
    this.hook = new PostCheckoutBase(this.config, this.context);

  });

  describe('#shouldSkipFileCheckout', function() {
    describe('when skipFileCheckout is not set', function() {
      it('returns true', function() {
        expect(this.hook.shouldSkipFileCheckout()).to.equal(true);
      })
    });

    describe('when skipFileCheckout is set to false', function() {
      beforeEach('setup config', function() {
        this.hook.config['skipFileCheckout'] = false;
      });

      it('returns false', function() {
        expect(this.hook.shouldSkipFileCheckout()).to.equal(false);
      })
    });

    describe('when skipFileCheckout is set to true', function() {
      beforeEach('setup config', function() {
        this.hook.config['skipFileCheckout'] = true;
      });

      it('returns false', function() {
        expect(this.hook.shouldSkipFileCheckout()).to.equal(true);
      })
    });
  });

  describe('#isEnabled', function() {
    describe('when the hook is not enabled', function() {
      beforeEach('setup config', function() {
        this.hook.config['enabled'] = false;
        this.sandbox.stub(this.hook, 'isFileCheckout').returns(false);
      });

      it('returns false', function() {
        expect(this.hook.isEnabled()).to.equal(false);
      });
    });

    describe('when it is a file checkout', function() {
      beforeEach('setup stub', function() {
        this.hook.config['enabled'] = true;
        this.sandbox.stub(this.hook, 'isFileCheckout').returns(true);
      });

      describe('when we should skip file checkouts', function() {
        beforeEach('setup stub', function() {
          this.sandbox.stub(this.hook, 'shouldSkipFileCheckout').returns(true);
        });

        it('return false', function() {
          expect(this.hook.isEnabled()).to.equal(false);
        });
      });

      describe('when we should not skip file checkouts', function() {
        beforeEach('setup stub', function() {
          this.sandbox.stub(this.hook, 'shouldSkipFileCheckout').returns(false);
        });

        it('return false', function() {
          expect(this.hook.isEnabled()).to.equal(true);
        });
      });
    });
  });
});
