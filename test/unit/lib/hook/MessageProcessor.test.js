'use strict';
const testHelper = require('../../../test_helper');
const expect = testHelper.expect;
const sinon = testHelper.sinon;
const MessageProcessor = testHelper.requireSourceModule(module);

const Config = testHelper.requireSourceModule(module, 'lib/config');
const HookBase = testHelper.requireSourceModule(module, 'lib/hook/Base');
const HookMessage = testHelper.requireSourceModule(module, 'lib/hook/Message');
const HookContextBase = testHelper.requireSourceModule(module, 'lib/hook-context/base');

// Shorthand to make writing these easier
const EMH = MessageProcessor.ERRORS_MODIFIED_HEADER + '\n';
const WMH = MessageProcessor.WARNINGS_MODIFIED_HEADER + '\n';
const EUH = MessageProcessor.ERRORS_UNMODIFIED_HEADER + '\n';
const WUH = MessageProcessor.WARNINGS_UNMODIFIED_HEADER + '\n';
const EGH = MessageProcessor.ERRORS_GENERIC_HEADER + '\n';
const WGH = MessageProcessor.WARNINGS_GENERIC_HEADER + '\n';

function errorMess(fileName, lineNumber) {
  return new HookMessage('error', fileName, lineNumber, 'Error!');
}

function warnMess(fileName, lineNumber) {
  return new HookMessage('warning', fileName, lineNumber, 'Warning!');
}

describe('MessageProcessor', function () {
  beforeEach('create message processor instance', function() {
    this.sandbox = sinon.sandbox.create();

    this.config = new Config({}, {validate: false});
    this.sandbox.stub(this.config, 'forHook').returns({});

    this.context = new HookContextBase(this.config, [], process.stdin);
    this.hook = new HookBase(this.config, this.context);

    this.unmodifiedLinesSetting = 'report';
    this.messageProcessor = new MessageProcessor(this.hook, this.unmodifiedLinesSetting);
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  describe('#hookResult', function() {
    describe('when there are no messages', function() {
      it('returns a pass when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult([]);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });

      it('returns a pass when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult([]);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });

      it('returns a pass when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult([]);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });
    });

    describe('when there is an error on modified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [errorMess('node.js', 2)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['2']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n');
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n');
      });
    });

    describe('when there is an error on unmodified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [errorMess('node.js', 2)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['3']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EUH + 'Error!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', EUH + 'Error!\n');
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });
    });

    describe('when there is a warning on modified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [warnMess('node.js', 2)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['2']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', WMH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', WMH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', WMH + 'Warning!\n');
      });
    });

    describe('when there is a warning on unmodified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [warnMess('node.js', 2)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['3']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', WUH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', WUH + 'Warning!\n');
      });

      it('passes when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });
    });

    describe('when there are errors and warnings on modified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [errorMess('affiance.js', 2), warnMess('node.js', 3)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('affiance.js').returns(['2']);
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['3', '4']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n' + WMH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n' + WMH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n' + WMH + 'Warning!\n');
      });
    });

    describe('when there are errors and warnings on unmodified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [errorMess('affiance.js', 2), warnMess('node.js', 3)];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('affiance.js').returns(['3']);
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['4', '5']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EUH + 'Error!\n' + WUH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', EUH + 'Error!\n' + WUH + 'Warning!\n');
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'pass');
        expect(hookResult).to.have.property('output', '');
      });
    });

    describe('when there are errors and warnings on unmodified/modified lines', function() {
      beforeEach('setup messages', function() {
        this.messages = [
          errorMess('affiance.js', 2),
          warnMess('affiance.js', 3),
          warnMess('node.js', 4),
          errorMess('node.js', 5)
        ];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('affiance.js').returns(['3', '4']);
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['5', '6']);
      });

      it('returns an error when unmodifiedLinesSetting is report', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'report';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property(
          'output',
          EMH + 'Error!\n' + WMH + 'Warning!\n' +
          EUH + 'Error!\n' + WUH + 'Warning!\n'
        );
      });

      it('returns an error when unmodifiedLinesSetting is warn', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'warn';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property(
          'output',
          EMH + 'Error!\n' + WMH + 'Warning!\n' + EUH + 'Error!\n' + WUH + 'Warning!\n'
        );
      });

      it('returns an error when unmodifiedLinesSetting is ignore', function() {
        this.messageProcessor.unmodifiedLinesSetting = 'ignore';
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', EMH + 'Error!\n' + WMH + 'Warning!\n');
      });
    });

    describe('when there are generic errors', function() {
      beforeEach('setup messages', function() {
        this.messages = [errorMess(), errorMess()];
        this.messageProcessor.unmodifiedLinesSetting = 'report';
      });

      it('returns the errors', function() {
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', 'Error!\nError!\n');
      });
    });

    describe('when there are generic warnings', function() {
      beforeEach('setup messages', function() {
        this.messages = [warnMess(), warnMess()];
        this.messageProcessor.unmodifiedLinesSetting = 'report';
      });

      it('returns the warnings', function() {
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'warn');
        expect(hookResult).to.have.property('output', 'Warning!\nWarning!\n');
      });
    });

    describe('when there are generic errors and warnings', function() {
      beforeEach('setup messages', function() {
        this.messages = [warnMess(), errorMess(), warnMess(), errorMess()];
        this.messageProcessor.unmodifiedLinesSetting = 'report';
      });

      it('returns the warnings', function() {
        let hookResult = this.messageProcessor.hookResult(this.messages);
        expect(hookResult).to.have.property('status', 'fail');
        expect(hookResult).to.have.property('output', 'Warning!\nError!\nWarning!\nError!\n');
      });
    });

    describe('when there are mix of messages', function() {
      beforeEach('setup line messages and modified lines', function() {
        this.lineMessages = [
          errorMess('affiance.js', 2),
          warnMess('affiance.js', 3),
          warnMess('node.js', 4),
          errorMess('node.js', 5)
        ];
        this.context.modifiedLinesInFile = this.sandbox.stub();
        this.context.modifiedLinesInFile.withArgs('affiance.js').returns(['3', '4']);
        this.context.modifiedLinesInFile.withArgs('node.js').returns(['5', '6']);
      });

      describe('and there are generic errors before line messages', function() {
        beforeEach('setup messages', function() {
          this.messages = [errorMess(), errorMess()].concat(this.lineMessages);
        });

        it('returns combined failure output', function() {
          let hookResult = this.messageProcessor.hookResult(this.messages);
          expect(hookResult).to.have.property('status', 'fail');
          expect(hookResult).to.have.property(
            'output',
            EGH + 'Error!\nError!\n' +
            EMH + 'Error!\n' + WMH + 'Warning!\n' +
            EUH + 'Error!\n' + WUH + 'Warning!\n'
          );
        });
      });

      describe('and there are generic warnings before line messages', function() {
        beforeEach('setup messages', function() {
          this.messages = [warnMess(), warnMess()].concat(this.lineMessages);
        });

        it('returns combined failure output', function() {
          let hookResult = this.messageProcessor.hookResult(this.messages);
          expect(hookResult).to.have.property('status', 'fail');
          expect(hookResult).to.have.property(
            'output',
            WGH + 'Warning!\nWarning!\n' +
            EMH + 'Error!\n' + WMH + 'Warning!\n' +
            EUH + 'Error!\n' + WUH + 'Warning!\n'
          );
        });
      });

      describe('and there are generic errors and warnings before line messages', function() {
        beforeEach('setup messages', function() {
          this.messages = [errorMess(), errorMess(), warnMess(), warnMess()].concat(this.lineMessages);
        });

        it('returns combined failure output', function() {
          let hookResult = this.messageProcessor.hookResult(this.messages);
          expect(hookResult).to.have.property('status', 'fail');
          expect(hookResult).to.have.property(
            'output',
            EGH + 'Error!\nError!\n' +
            WGH + 'Warning!\nWarning!\n' +
            EMH + 'Error!\n' + WMH + 'Warning!\n' +
            EUH + 'Error!\n' + WUH + 'Warning!\n'
          );
        });
      });

      describe('and there are generic errors after line messages', function() {
        beforeEach('setup messages', function() {
          this.messages = this.lineMessages.concat([errorMess(), errorMess()]);
        });

        it('returns combined failure output', function() {
          let hookResult = this.messageProcessor.hookResult(this.messages);
          expect(hookResult).to.have.property('status', 'fail');
          expect(hookResult).to.have.property(
            'output',
            EGH + 'Error!\nError!\n' +
            EMH + 'Error!\n' + WMH + 'Warning!\n' +
            EUH + 'Error!\n' + WUH + 'Warning!\n'
          );
        });
      });

      describe('and there are generic warnings after line messages', function() {
        beforeEach('setup messages', function() {
          this.messages = this.lineMessages.concat([warnMess(), warnMess()]);
        });

        it('returns combined failure output', function() {
          let hookResult = this.messageProcessor.hookResult(this.messages);
          expect(hookResult).to.have.property('status', 'fail');
          expect(hookResult).to.have.property(
            'output',
            WGH + 'Warning!\nWarning!\n' +
            EMH + 'Error!\n' + WMH + 'Warning!\n' +
            EUH + 'Error!\n' + WUH + 'Warning!\n'
          );
        });
      });
    });
  });
});
