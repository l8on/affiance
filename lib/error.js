'use strict';

module.exports = {
  error: function(name, message, originalError) {
    let error = new Error(message);
    error.affianceName = name;
    error.originalError = originalError;

    return error;
  },

  // Thrown if we can't get a list of commit refs to be pushed
  ConfigurationError: 'ConfigurationError',

  // Thrown when config signature fails verification
  ConfigurationSignatureChanged: 'ConfigurationSignatureChanged',

  // Thrown if git configuration is invalid ans is preventing
  // an operation (like figuring out where to sign).
  GitConfigError: 'GitConfigError',

  // Thrown if we can't get a list of commit refs to be pushed
  GitRevListError: 'GitRevListError',

  // Thrown when we fail to load the hook context.
  HookContextLoadError: 'HookContextLoadError',

  // Thrown when cleanup of hook context fails
  HookCleanupFailed: 'HookCleanupFailed',

  // Thrown when we fail to load the hook itself.
  HookLoadError: 'HookLoadError',

  // Thrown when setup of hook context fails
  HookSetupFailed: 'HookSetupFailed',

  // Thrown when the hooks are interrupted.
  InterruptReceived: 'InterruptReceived',

  // Thrown when no valid git folder is found.
  InvalidGitRepo: 'InvalidGitRepo',

  // Thrown when a hook has an invalid configuration
  InvalidHookDefinition: 'InvalidHookDefinition',

  // Thrown when a plugin signature changes
  InvalidHookSignature: 'InvalidHookSignature',

  // Thrown when a hook can't process the message output
  MessageProcessingError: 'MessageProcessingError',

  // Thrown when there are pre-exiting hooks that affiance did not create when trying to install.
  PreExistingHooks: 'PreExistingHooks'
};
