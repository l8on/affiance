'use strict';
const _ = require('lodash');
const path = require('path');
const testHelper = require('../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const Config = testHelper.requireSourceModule(module);
const gitRepo = testHelper.requireSourceModule(module, 'lib/gitRepo');

describe('Config', function() {
  describe('constructor', function() {
    it('creates sections for hook types that are not defined', function() {
      let config = new Config({});
      expect(config.json['PreCommit']).to.exist;
    });

    it('creates an ALL key for hook types', function() {
      let config = new Config({});
      expect(config.json['PreCommit']['ALL']).to.exist;
    });

    it('converts empty values to empty hashes', function() {
      let config = new Config({
        PreCommit: {
          SomeHook: null
        }
      });
      expect(config.json['PreCommit']['SomeHook']).to.deep.equal({});
    });
  });

  describe('.smartMerge', function() {
    it('returns an empty object if parent and child are empty', function() {
      expect(Config.smartMerge({}, {})).to.deep.equal({});
    });

    it('returns an equivalent object if parent and child are the same', function() {
      let child = {
        'pluginDirectory': 'some-directory',
        'PreCommit': {
          'SomeHook': {
            'enabled': true
          }
        }
      };

      let parent = child;
      expect(Config.smartMerge(parent, child)).to.deep.equal(child);
      expect(Config.smartMerge(parent, child)).to.deep.equal(parent);
    });

    describe('when parent item contains a hash', function() {
      beforeEach('setup parent', function() {
        this.parent = {
          'PreCommit': {
            'SomeHook': {
              'someValue': 1
            }
          }
        };
      });

      describe('and child item contains a different hash under the same key', function() {
        beforeEach('setup child', function() {
          this.child = {
            'PreCommit': {
              'SomeOtherHook': {
                'someOtherValue': 2
              }
            }
          };
        });

        it('merges the 2 objects', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);
          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook').that.deep.equals({
            'someValue': 1
          });
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeOtherHook').that.deep.equals({
            'someOtherValue': 2
          });
        });
      });

      describe('and child item contains a different hash under the same key', function() {
        beforeEach('setup child', function() {
          this.child = {
            'PreCommit': {
              'SomeOtherHook': {
                'someOtherValue': 2
              }
            }
          };
        });

        it('merges the 2 objects', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);
          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook').that.deep.equals({
            'someValue': 1
          });
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeOtherHook').that.deep.equals({
            'someOtherValue': 2
          });
        });
      });

      describe('and child item contains a different hash under a different key', function() {
        beforeEach('setup child', function() {
          this.child = {
            'CommitMsg': {
              'SomeOtherHook': {
                'someOtherValue': 2
              }
            }
          };
        });

        it('merges the 2 objects', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);
          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson).to.have.property('CommitMsg');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook').that.deep.equals({
            'someValue': 1
          });
          expect(mergedConfigJson['CommitMsg']).to.have.property('SomeOtherHook').that.deep.equals({
            'someOtherValue': 2
          });
        });
      });

      describe('and child item contains a hash under the ALL key', function() {
        beforeEach('setup child', function() {
          this.child = {
            'PreCommit': {
              'ALL': {
                'someOtherValue': 2
              },
              'SomeOtherHook': {
                'someOtherValue': 3
              }
            }
          };
        });

        it('overrides the value in the parent item', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);

          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook').that.deep.equals({
            'someValue': 1,
            'someOtherValue': 2
          });
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeOtherHook').that.deep.equals({
            'someOtherValue': 3
          });
        });
      });
    });

    describe('when parent item contains an array', function() {
      beforeEach('setup parent', function () {
        this.parent = {
          'PreCommit': {
            'SomeHook': {
              'list': [1, 2, 3]
            }
          }
        };
      });

      describe('and child item contains an array', function() {
        beforeEach('setup child', function () {
          this.child = {
            'PreCommit': {
              'SomeHook': {
                'list': [4, 5]
              }
            }
          };
        });

        it('overrides the value in the parent item', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);
          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook');
          expect(mergedConfigJson['PreCommit']['SomeHook'])
            .to.have.property('list').that.deep.equals([4, 5])
        })
      });

      describe('and child item contains a single item', function() {
        beforeEach('setup child', function () {
          this.child = {
            'PreCommit': {
              'SomeHook': {
                'list': 4
              }
            }
          };
        });

        it('overrides the value in the parent item', function() {
          let mergedConfigJson = Config.smartMerge(this.parent, this.child);
          expect(mergedConfigJson).to.have.property('PreCommit');
          expect(mergedConfigJson['PreCommit']).to.have.property('SomeHook');
          expect(mergedConfigJson['PreCommit']['SomeHook']).to.have.property('list', 4)
        })
      });
    });
  });

  describe('#pluginDirectory', function() {
    beforeEach('create config object', function() {
      this.config = new Config({
        pluginDirectory: 'some-directory'
      });
    });

    it('returns the absolute path to the plugin directory', function() {
      let expectedPath = path.join(gitRepo.repoRoot(), 'some-directory');
      expect(this.config.pluginDirectory()).to.equal(expectedPath);
    });
  });

  describe('#forHook', function() {
    beforeEach('setup hook config', function() {
      this.config = new Config({
        'PreCommit': {
          'ALL': {
            'required': false
          },
          'SomeHook': {
            'enabled': true,
            'quiet': false
          }
        }
      });

      this.hookConfig = this.config.forHook('SomeHook', 'PreCommit');
    });

    it('returns the subset of the config for the specified hook', function() {
      expect(this.hookConfig).to.have.property('enabled', true);
      expect(this.hookConfig).to.have.property('quiet', false);
    });

    it('merged the hook config with the ALL section', function() {
      expect(this.hookConfig).to.have.property('required', false);
    });
  });

  describe('#enabledBuiltInHooks', function() {
    beforeEach('setup hook config and stubs', function() {
      this.config = new Config({
        'PreCommit': {
          'ALL': {
            'required': false
          },
          'SomeHook': {
            'enabled': true,
            'quiet': false
          },
          'SomeOtherHook': {
            'enabled': true
          },
          'SomePluginHook': {
            'enabled': true
          },
          'SomeDisabledHook': {
            'enabled': false
          },
          'SomeAdHocHook': {
            'enabled': true,
            'command': 'adhoc command'
          }
        }
      });

      this.context = {
        hookScriptName: 'pre-commit',
        hookConfigName: 'PreCommit'
      };

      this.sandbox = sinon.sandbox.create();
      // Default return value to false.
      this.sandbox.stub(this.config, 'isBuiltInHook').returns(false);
    });

    it('returns an empty list if there are no built in hooks', function () {
      let enabledBuiltInHooks = this.config.enabledBuiltInHooks(this.context);
      expect(enabledBuiltInHooks).to.deep.equal([]);
    });

    it('returns the list of enabled built in hook names', function () {
      // These are the built in hooks
      this.config.isBuiltInHook.withArgs(this.context, 'SomeHook').returns(true);
      this.config.isBuiltInHook.withArgs(this.context, 'SomeOtherHook').returns(true);
      this.config.isBuiltInHook.withArgs(this.context, 'SomeDisabledHook').returns(true);

      let enabledBuiltInHooks = this.config.enabledBuiltInHooks(this.context);
      expect(enabledBuiltInHooks).to.have.length(2);
      expect(enabledBuiltInHooks).to.include('SomeHook');
      expect(enabledBuiltInHooks).to.include('SomeOtherHook');
    });
  });

  describe('#enabledAdHocHooks', function() {
    beforeEach('setup hook config and stubs', function() {
      this.config = new Config({
        'PreCommit': {
          'ALL': {
            'required': false
          },
          'SomeHook': {
            'enabled': true,
            'quiet': false
          },
          'SomePluginHook': {
            'enabled': true
          },
          'SomeDisabledHook': {
            'enabled': false,
            'command': 'adhoc flag'
          },
          'SomeAdHocHook': {
            'enabled': true,
            'command': 'adhoc command'
          },
          'SomeOtherAdHocHook': {
            'enabled': true,
            'command': 'command adhoc'
          }
        }
      });

      this.context = {
        hookScriptName: 'pre-commit',
        hookConfigName: 'PreCommit'
      };

      this.sandbox = sinon.sandbox.create();
      // Default return value to false.
      this.sandbox.stub(this.config, 'isAdHocHook').returns(false);
    });

    it('returns an empty list if there are no ad hoc hooks', function() {
      let enabledAdHocHooks = this.config.enabledAdHocHooks(this.context);
      expect(enabledAdHocHooks).to.deep.equal([]);
    });

    it('returns the list of enabled built in hook names', function () {
      // These are the built in hooks
      this.config.isAdHocHook.withArgs(this.context, 'SomeAdHocHook').returns(true);
      this.config.isAdHocHook.withArgs(this.context, 'SomeOtherAdHocHook').returns(true);
      this.config.isAdHocHook.withArgs(this.context, 'SomeDisabledHook').returns(true);

      let enabledAdHocHooks = this.config.enabledAdHocHooks(this.context);
      expect(enabledAdHocHooks).to.have.length(2);
      expect(enabledAdHocHooks).to.include('SomeAdHocHook');
      expect(enabledAdHocHooks).to.include('SomeOtherAdHocHook');
    });
  });

  describe('#applyEnvironment', function() {
    beforeEach('set up hook config for env application', function() {
      this.hookContext = {
        hookScriptName: 'pre_commit',
        hookConfigName: 'PreCommit'
      };

      this.config = new Config({});
      this.originalConfigJson = _.merge({}, this.config.json);

      this.sandbox = sinon.sandbox.create();
      this.sandbox.stub(this.config, 'hookExists').returns(true);
    });

    afterEach('restore stubs', function() {
      this.sandbox.restore()
    });

    it('does not change the configuration if nothing is skipped', function() {
      this.config.applyEnvironment(this.hookContext, {});
      expect(this.config.json).to.deep.equal(this.originalConfigJson);
    });

    describe('when a non-existent hook is requested to be skipped', function() {
      beforeEach('setup stub return', function() {
        this.config.hookExists.withArgs(this.hookContext, 'SomeMadeUpHook').returns(false);
        this.env = {'SKIP': 'SomeMadeUpHook'};
      });

      it('does not change the configuration', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        expect(this.config.json).to.deep.equal(this.originalConfigJson);
      });
    });

    describe('when an existing hook is requested to be skipped', function() {
      beforeEach('setup stub return', function() {
        this.config.hookExists.withArgs(this.hookContext, 'AuthorName').returns(true);
        this.env = {'SKIP': 'AuthorName'};
      });

      it('sets the skip option of the hook to true', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('AuthorName', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });

      it('sets the skip option of the hook to true if spelled with underscores', function() {
        this.env = {'SKIP': 'author_name'};
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('AuthorName', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });

      it('sets the skip option of the hook to true if spelled with dashes', function() {
        this.env = {'SKIP': 'author-name'};
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('AuthorName', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });
    });

    describe('when "all" is in the skipped list', function() {
      beforeEach('setup stub return', function() {
        this.env = {'SKIP': 'all'};
      });

      it('sets the skip option of the ALL section to true', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('ALL', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });
    });

    describe('when "ALL" is in the skipped list', function() {
      beforeEach('setup stub return', function() {
        this.env = {'SKIP': 'ALL'};
      });

      it('sets the skip option of the ALL section to true', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('ALL', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });
    });

    describe('when the only option is used', function() {
      beforeEach('setup stub return', function() {
        this.config.hookExists.withArgs(this.hookContext, 'AuthorName').returns(true);
        this.env = {'ONLY': 'AuthorName'};
      });

      it('sets the skip option of the ALL section to true', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('ALL', 'PreCommit');
        expect(hookConfig).to.have.property('skip', true);
      });

      it('sets the skip option of the filtered hook to false', function() {
        this.config.applyEnvironment(this.hookContext, this.env);
        let hookConfig = this.config.forHook('AuthorName', 'PreCommit');
        expect(hookConfig).to.have.property('skip', false);
      });
    });
  });
});
