'use strict';
const configLoader = require('./config/loader');
const AffianceError = require('./error');
const gitRepo = require('./gitRepo');
const HookContext = require('./hook-context');
const HookRunner = require('./HookRunner');
const Installer = require('./cli/Installer');
const Logger = require('./Logger');
const Printer = require('./Printer');
const utils = require('./utils');

let Affiance = {};

Affiance.configLoader = configLoader;
Affiance.error = AffianceError;
Affiance.HookContext = HookContext;
Affiance.HookRunner = HookRunner;
Affiance.Installer = Installer;
Affiance.Logger = Logger;
Affiance.Printer = Printer;
Affiance.utils = utils;
Affiance.gitRepo = gitRepo;

module.exports = Affiance;



