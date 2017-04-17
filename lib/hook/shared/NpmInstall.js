// Common run function for each `NpmInstall` hook.
// Relies on `this` being an instance of `HookBase`.
exports.run = function() {
  var result = this.execute(this.command());
  if (result.status !== 0) {
    return ['fail', result.stderr.toString()];
  }

  return 'pass';
};
