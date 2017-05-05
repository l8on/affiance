'use strict';
const fse = require('fs-extra');
const childProcess = require('child_process');
const fileUtils = require('../fileUtils');
const gitRepo = require('../gitRepo');

/**
 * Base class for all Hook specific context classes
 */
module.exports = class HookContextBase {

  /**
   * Create a HookContextBase instance
   *
   * @param {Config} config - the affiance Config object.
   * @param {string[]} argv - the array of arguments provided to the hook binary
   * @param {Readable} input - the readable input stream (usually stdin).
   */
  constructor(config, argv, input) {
    this.config = config;
    this.argv = argv;
    this.input = input;
    this._initializeProcessLocks();
  }

  /**
   * Executes a command like a standard git hook; providing the args and stdin.
   * This is intended to be used for custom hooks that allow users to define
   * arbitrary hooks to run from the repo.
   *
   * @param {string} command - the command to run
   * @param {string[]} extraArgs - the arguments to pass to the hook
   * @returns {object} the spawnSync result
   */
  executeHook(command, extraArgs) {
    extraArgs = extraArgs || [];
    return childProcess.spawnSync(command, this.argv.slice(1).concat(extraArgs), {
      stdio: [
        this.input, //Use parent input for `stdin`
        'pipe', //Pipe output to `stdin`
        'pipe' //Pipe errors to `stdin`
      ]
    });
  }

  /**
   * Initializes anything related to the env.
   * This will be called before the hooks run.
   * A stub is defined here, but subclasses can set up
   * the environment as necessary.
   */
  setupEnvironment() {}

  /**
   * Cleans up any setup done to environment.
   * This will be called after the hooks have been run.
   * Intended to undo `setupEnvironment` side effects.
   */
  cleanupEnvironment() {}

  /**
   * Returns a list of modified files.
   * Returns an empty list of files. Subclasses should
   * implement if there is a concept of changing files for
   * that type of hook.
   *
   * @returns {string[]} a list of modified file paths
   */
  modifiedFiles() {
    return [];
  }

  /**
   * Filter modified files for directories and non-existent references
   *
   * @param {string[]} modifiedFiles - list of modified paths
   * @returns {string[]} the list filtered to just files that exist and are not directories
   */
  filterModifiedFiles(modifiedFiles) {
    return this.filterDirectories(this.filterNonexistent(modifiedFiles));
  }

  /**
   * Filter non existent files from a list of paths
   *
   * @param {string[]} modifiedFiles - list of modified paths
   * @returns {string[]} the list filtered to just files that exist
   */
  filterNonexistent(modifiedFiles) {
    return modifiedFiles.filter((file) => {
      return fse.existsSync(file) || fileUtils.isBrokenSymlink(file);
    });
  }

  /**
   * Filter directories from a list of paths
   *
   * @param {string[]} modifiedFiles - list of modified paths
   * @returns {string[]} the list filtered to just files
   */
  filterDirectories(modifiedFiles) {
    return modifiedFiles.filter(function(file) {
      return !fileUtils.isDirectory(file) || fileUtils.isSymbolicLink(file);
    });
  }

  /**
   * Returns a list of all of the files tracked by git.
   *
   * @returns {string[]} all the tracked files
   */
  allFiles() {
    return gitRepo.allFiles();
  }

  /**
   * Returns the input stream as a string
   *
   * @returns {string} the input stream's data as a string
   */
  inputString() {
    if (!this._inputString) {
      let size = fse.fstatSync(this.input.fd).size;

      if (size === 0) {
        this._inputString = '';
      } else {
        let buffer = Buffer.from('');
        fse.readSync(this.input.fd, buffer, 0, size, 0);
        this._inputString = buffer.toString();
      }
    }

    return this._inputString;
  }

  /**
   * Returns the input stream data as a list of strings for each line of input
   *
   * @returns {string[]} the input stream's data as a list of strings
   */
  inputLines() {
    if(!this._inputLines) {
      this._inputLines = this.inputString().split('\n');
    }
    return this._inputLines;
  }

  /**
   * Returns the input stream data as a list of strings for each line of input
   *
   * @returns {Promise} a promise that will be resolved when a slot is available with the slotId
   * @resolve {number} the slotId
   * @rejects {undefined}
   */
  waitForProcessSlot() {
    if (this._processSlotsUsedCount < this.config.concurrency()) {
      return this._allocateProcessSlot();
    }

    return new Promise((resolve, reject) => {
      this._waitingQueue.unshift({
        resolve: resolve,
        reject: reject
      });
    });
  }

  /**
   * Releases the slot identified by `slotId` and allocates a slot to the next
   * promise in the waiting queue.
   *
   * @param {number} slotId - the slot to release.
   */
  releaseProcessSlot(slotId) {
    if (this._processSlots[slotId]) {
      delete this._processSlots[slotId];
      this._processSlotsUsedCount--;
    }

    if (this._waitingQueue.length && this._processSlotsUsedCount < this.config.concurrency()) {
      let waiting = this._waitingQueue.pop();
      this._allocateProcessSlot(waiting.resolve);
    }
  }

  /**
   * Clears all pending items in the waiting queue.
   * Used when we have been interrupted or an error has halted progress
   * and we don't want to start the waiting processes.
   */
  clearWaitingQueue() {
    this._waitingQueue.forEach((queueItem) => { queueItem.reject(); });
  }

  _initializeProcessLocks() {
    this._waitingQueue = [];
    this._processSlots = {};
    this._processSlotsUsedCount = 0;
  }

  _allocateProcessSlot(resolve) {
    let slotId = Date.now();
    this._processSlots[slotId] = resolve ? resolve(slotId) : Promise.resolve(slotId);
    this._processSlotsUsedCount++;
    return this._processSlots[slotId];
  }
};



