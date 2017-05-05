'use strict';
// Get the type of hook from the arguments.
const hookType = process.argv[2];
// Capture original args sent to hook script
const originalArgs = process.argv.slice(3);


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
let Affiance = {};

try {
  Affiance = require('affiance');
} catch (e) {
  if (e.message === "Cannot find module 'affiance'") {
    console.log('This repository contains hooks installed by Affiance, but the ' +
                '`affiance` module is not installed.\n' +
                'Install it with `npm install affiance`.');

    process.exit();
  } else {
    throw e;
  }
}

function handleErrorAndExit(e) {
  /* eslint-disable no-fallthrough */
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
      console.log(e.message || e);
      if (e.stack) { console.log(e.stack); }
      process.exit(70); // EX_SOFTWARE
  }
}

// Run the requested hook based on the repo's config.
try {
  // Capture unhandled rejections before we create any Promises.
  process.on('unhandledRejection', (e) => {
    handleErrorAndExit(e);
  });

  let logger = new Affiance.Logger({level: process.env.LOG_LEVEL});


  // TODO figure out how to get this to actually work!
  // Currently hangs when spawning itself.
  //
  // Ensure master hook is up to date
  // let installer = new Affiance.Installer(logger);
  // if (installer.update()) {
  //     // If the installation was updated, re-run the current command.
  //     let childProcess = require('child_process');
  //     let repoRoot = Affiance.gitRepo.repoRoot();
  //     let command = repoRoot + '/.git/hooks/' + hookType;
  //     let spawnResult = childProcess.spawnSync(command, originalArgs, {detached: true});
  //     process.exit(spawnResult.status);
  // }

  let config  = Affiance.configLoader.loadRepoConfig();
  let hookContext = Affiance.HookContext.createContext(hookType, config, originalArgs, process.stdin);
  config.applyEnvironment(hookContext, process.env);

  let printer = new Affiance.Printer(config, logger, hookContext);
  let hookRunner = new Affiance.HookRunner(config, logger, hookContext, printer);

  hookRunner.run().then(function(result) {
    // We finished, use the result
    process.exit(result ? 0 : 65); // EX_DATAERR
  }).catch(handleErrorAndExit);

} catch (e) {
  handleErrorAndExit(e);
}
