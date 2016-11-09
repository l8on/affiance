var testHelper = require('../../test_helper');
var expect = testHelper.expect;
var sinon = testHelper.sinon;
var Affiance = testHelper.requireSourceModule(module);


describe('Affiance', function() {
  it('exports the configLoader', function() {
    expect(Affiance.configLoader).to.equal(
      testHelper.requireSourceModule(module, 'lib/config/loader')
    )
  });

  it('exports AffianceError', function() {
    expect(Affiance.error).to.equal(
      testHelper.requireSourceModule(module, 'lib/error')
    )
  });

  it('exports HookContext', function() {
    expect(Affiance.HookContext).to.equal(
      testHelper.requireSourceModule(module, 'lib/hook-context')
    )
  });

  it('exports Installer', function() {
    expect(Affiance.Installer).to.equal(
      testHelper.requireSourceModule(module, 'lib/cli/Installer')
    )
  });

  it('exports Logger', function() {
    expect(Affiance.Logger).to.equal(
      testHelper.requireSourceModule(module, 'lib/Logger')
    )
  });

  it('exports Logger', function() {
    expect(Affiance.Logger).to.equal(
      testHelper.requireSourceModule(module, 'lib/Logger')
    )
  });

  it('exports Printer', function() {
    expect(Affiance.Printer).to.equal(
      testHelper.requireSourceModule(module, 'lib/Printer')
    )
  });

  it('exports utils', function() {
    expect(Affiance.utils).to.equal(
      testHelper.requireSourceModule(module, 'lib/utils')
    )
  });
});
