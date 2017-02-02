var configLoader = require('./config/loader');
var error = require('./error');
var gitRepo = require('./gitRepo');
var HookContext = require('./hook-context');
var HookRunner = require('./HookRunner');
var Installer = require('./cli/Installer');
var Logger = require('./Logger');
var Printer = require('./Printer');
var utils = require('./utils');

var Affiance = {};

Affiance.configLoader = configLoader;
Affiance.error = error;
Affiance.HookContext = HookContext;
Affiance.HookRunner = HookRunner;
Affiance.Installer = Installer;
Affiance.Logger = Logger;
Affiance.Printer = Printer;
Affiance.utils = utils;
Affiance.gitRepo = gitRepo;

module.exports = Affiance;



