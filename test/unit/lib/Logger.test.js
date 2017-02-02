var testHelper = require('../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var Logger = testHelper.requireSourceModule(module);

describe('Logger', function() {
  beforeEach('setup fake console', function() {
    this.sandbox = sinon.sandbox.create();

    this.mockConsole = {
      log: this.sandbox.stub()
    };

    this.mockClc = {
      magenta: function(){ return this; },
      bold: function(){ return this; },
      red: function(){ return this; },
      green: function(){ return this; },
      yellow: function(){ return this; }
    };

    var allColors = Object.keys(this.mockClc);

    this.sandbox.spy(this.mockClc, 'magenta');
    this.sandbox.spy(this.mockClc, 'bold');
    this.sandbox.spy(this.mockClc, 'red');
    this.sandbox.spy(this.mockClc, 'green');
    this.sandbox.spy(this.mockClc, 'yellow');

    for(var color in this.mockClc) {
      for(var otherColor in this.mockClc) {
        this.mockClc[color][otherColor] = this.mockClc[otherColor];
      }
    }

    // this.mockClc = {
    //   magenta: this.sandbox.stub().returns(mockClc),
    //   bold: this.sandbox.stub().returns(mockClc),
    //   red: this.sandbox.stub().returns(mockClc),
    //   green: this.sandbox.stub().returns(mockClc),
    //   yellow: this.sandbox.stub().returns(mockClc)
    // };
  });

  afterEach('restore sandbox', function() {
    this.sandbox.restore();
  });

  describe('constructor', function() {
    it('defaults the log level to `info`', function() {
      var logger = new Logger();
      expect(logger.options.level).to.equal('info');
    });

    it('accepts the level option', function() {
      var logger = new Logger({level: 'debug'});
      expect(logger.options.level).to.equal('debug');
    });

    it('uses the console provided', function() {
      var logger = new Logger({console: this.mockConsole});
      expect(logger.console).to.equal(this.mockConsole);
    });

    it('accepts the silent option', function() {
      var logger = new Logger({silent: true});
      expect(logger.silent).to.equal(true);
    });
  });

  describe('when an instance has been constructed', function() {
    beforeEach('create logger', function() {
      this.logger = new Logger({
        clc: this.mockClc,
        console: this.mockConsole
      });
    });

    describe('#newLine', function() {
      it('calls log with no arguments to output a new line', function() {
        this.logger.newline();
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#log', function() {
      it('calls log with provided arguments', function() {
        this.logger.log('something', 'to', 'log');
        expect(this.mockConsole.log).to.have.been.calledWith('something', 'to', 'log');
      });
    });

    describe('#debug', function() {
      it('does nothing if the log level is not debug', function() {
        this.logger.debug('something', 'to', 'debug');
        expect(this.mockConsole.log).to.not.have.been.called
      });

      it('logs the provided arguments in magenta', function() {
        this.logger.options.level = 'debug';
        this.logger.debug('something', 'to', 'debug');

        expect(this.mockClc.magenta).to.have.been.calledWith('something', 'to', 'debug');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#bold', function() {
      it('logs the provided arguments in bold', function() {
        this.logger.bold('something', 'to', 'bold');

        expect(this.mockClc.bold).to.have.been.calledWith('something', 'to', 'bold');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#error', function() {
      it('logs the provided arguments in red', function() {
        this.logger.error('something', 'to', 'error');

        expect(this.mockClc.red).to.have.been.calledWith('something', 'to', 'error');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#errorBold', function() {
      it('logs the provided arguments in bold red', function() {
        this.logger.errorBold('something', 'to', 'errorBold');

        expect(this.mockClc.bold).to.have.been.calledWith('something', 'to', 'errorBold');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#success', function() {
      it('logs the argument in green', function() {
        this.logger.success('something', 'to', 'success');

        expect(this.mockClc.green).to.have.been.calledWith('something', 'to', 'success');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#warn', function() {
      it('logs the argument in yellow', function() {
        this.logger.warn('something', 'to', 'warn');

        expect(this.mockClc.yellow).to.have.been.calledWith('something', 'to', 'warn');
        expect(this.mockConsole.log).to.have.been.called
      });
    });

    describe('#warnBold', function() {
      it('logs the argument in yellow bold', function() {
        this.logger.warnBold('something', 'to', 'warnBold');

        expect(this.mockClc.bold).to.have.been.calledWith('something', 'to', 'warnBold');
        expect(this.mockConsole.log).to.have.been.called
      });
    });
  });

  describe('when a silent instance has been constructed', function() {
    beforeEach('create silent logger', function () {
      this.logger = new Logger({
        clc: this.mockClc,
        console: this.mockConsole,
        silent: true
      });
    });

    it('does not log anything', function() {
      this.logger.newline();
      this.logger.log('something');
      this.logger.debug('something');
      this.logger.bold('something');
      this.logger.error('something');
      this.logger.errorBold('something');
      this.logger.warn('something');
      this.logger.warnBold('something');

      expect(this.mockConsole.log).to.not.have.been.called
    });
  });
});
