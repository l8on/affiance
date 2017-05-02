"use strict";
// Get the type of hook from the arguments.
var hookType = process.argv[2];
// Capture original args sent to hook script
var originalArgs = process.argv.slice(3);


// Allow hooks to be disabled via environment variable so git commands can be run
// in scripts without Affiance running hooks
if (process.env.AFFIANCE_DISABLE || process.env.AFFIANCE_DISABLED) {
  process.exit();
}

// Exit early if the `affiance-hook` file was invoked directly.
if (hookType === 'affiance-hook') {
    console.log("Don't run `affiance-hook` directly." +
                "It is intended to be symlinked by each hook in a repo's .git/hooks directory.");
    process.exit(64); // EX_USAGE
}

// Ensure we can load the affiance module.
try {
    var Affiance = require('affiance');
} catch (e) {
    if (e.message === "Cannot find module 'affiance'") {
        console.log('This repository contains hooks installed by Affiance, but the ' +
                    "`affiance` module is not installed.\n" +
                    'Install it with `npm install affiance`.');

        process.exit();
    } else {
        throw e;
    }
}

function handleErrorAndExit(e) {
  console.log('in handleErrorAndExit', e);
  // Affiance specific errors all have an `affianceName` property.
  // If undefined, will use the default condition.
  switch(e.affianceName) {
    case Affiance.error.ConfigurationError:
    case Affiance.error.ConfigurationSignatureChanged:
      console.log(e.message);
      process.exit(77); // EX_CONFIG

    case Affiance.error.HookSetupFailed:
    case Affiance.error.HookCleanupFailed:
      console.log(e.message);
      process.exit(74); // EX_IOERR

    case Affiance.error.HookLoadError:
    case Affiance.error.InvalidHookDefinition:
      console.log(e.message);
      if (e.stack) { console.log(e.stack); }
      process.exit(78); // EX_CONFIG

    case Affiance.error.InvalidGitRepo:
      console.log(e.message);
      process.exit(64); // EX_USAGE

    default:
      console.log(e.message);
      if (e.stack) { console.log(e.stack); }
      process.exit(70); // EX_SOFTWARE
  }
};

// Capture unhandled Rejections as well
process.on('unhandledRejection', (e, p) => {
  console.log('~~~~ process unhandledRejection', p);
  handleErrorAndExit(e);
});

// Run the requested hook based on the repo's config.
try {
    var logger = new Affiance.Logger({level: process.env.LOG_LEVEL});

    // Ensure master hook is up to date
    var installer = new Affiance.Installer(logger);

    // TODO figure out how to get this to actually work! Currently hangs when spawning.
    if (installer.update()) {
        // If the installation was updated, re-run the current command.
        var childProcess = require('child_process');
        var repoRoot = Affiance.gitRepo.repoRoot();
        var command = repoRoot + '/.git/hooks/' + hookType;
        var spawnResult = childProcess.spawnSync(command, originalArgs, {detached: true});
        process.exit(spawnResult.status);
    }

    var config  = Affiance.configLoader.loadRepoConfig();
    var hookContext = Affiance.HookContext.createContext(hookType, config, originalArgs, process.stdin);
    config.applyEnvironment(hookContext, process.env);

    var printer = new Affiance.Printer(config, logger, hookContext);
    var hookRunner = new Affiance.HookRunner(config, logger, hookContext, printer);

    process.on('exit', function(code) { console.log('~~~~~process exited', code)});

    // catches ctrl+c event
    process.on('SIGINT', function() { console.log('~~~~~process siginted'); process.exit(); });

    //catches uncaught exceptions
    process.on('uncaughtException', function(e) { console.log('~~~~~process uncaughtExceptioned', e)});
    process.on('unhandledRejection', function(reason, p) { console.log('~~~~~process unhandledRejection', reason, p)});
    process.on('rejectionHandled', function() { console.log('~~~~~process rejectionHandled')});

    console.log('in affiance-hook.js before statusPromise');
    var statusPromise = hookRunner.run();
    console.log('in affiance-hook.js after statusPromise', statusPromise);

    statusPromise.then(function(result) {
      console.log('in affiance-hook.js statusPromise#then', result);
      // We finished, use the result
      process.exit(result ? 0 : 65); // EX_DATAERR

    }).catch(function(result) {
      console.log('in affiance-hook.js statusPromise#catch', result);
      if (e.stack) { console.log(result.stack); }
      // If an affiance error was thrown, rethrow error so it is caught in block below.
      if (typeof result === 'object') { throw result; }

      // Something went wrong!
      console.log('in affiance-hook.js statusPromise#catch', result);
      process.exit(65); // EX_DATAERR
    });

} catch (e) {
  console.log('in affiance-hook.js catch block');
  handleErrorAndExit(e);
}
