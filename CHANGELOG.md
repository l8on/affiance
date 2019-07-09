# Affiance Changelog

## 1.6.0
* Add TsLint pre-commit hook

## 1.5.1
* Fix ad hoc hook creation

## 1.5.0
* Add ignoreMessagePattern setting on hooks to allow messages that follow a pattern to be ignored.
  Useful for working around missing features in linters.

## 1.4.0
* Add NspCheck hook 

## 1.3.5
* Work around empty stylint results when linting large files

## 1.3.4
* Fix problemOnUnmodifiedLine setting

## 1.3.3
* Fix link in starter config file

## 1.3.2
* Fail coffeelint if the process never starts

## 1.3.1
### Bugs Fixed
* Stop configurations from bleeding across hooks

## 1.3.0
### New Features
* A top level `nodeModuleMode` setting has been added.
  This can be set to `global` if you want to use global
  modules for affiance hooks.

## 1.2.0
### New Features
* Affiance has gone all in on es6
* Affiance is pot-committed on typed jsdocs, all hook classes are documented

### Bugs Fixed
* Issues with parallelizing some hooks

## 1.1.0
### New Features
* Affiance now requires node >= 4 with a v8 engine that supports es6 features
* Better performance with non-blocking process spawning for pre commit hooks
* Number of parallel processes is limited by the `concurrency` configuration
* Use local node module binaries id default.yml file

## 1.0.11
* Fix MERGE_HEAD corruption

## 1.0.10
* Fix StylusLint output

## 1.0.9
* Make MochaOnly hook more selective

## 1.0.8
* Display full coffeelint message

## 1.0.7
* Fix silent coffeelint failures

## 1.0.6
* Add version command and support for AFFIANCE_DISABLE

## 1.0.5
* Improve UX when signature check fails

## 1.0.4
* Improve UX when signature check fails

## 1.0.3
* Fix issues with identifying applicable hook files

## 1.0.2
* Update post install message to use local binary

## 1.0.1
* Fix bug with fresh install of affiance so it works "our of the box"

## 1.0.0
Initial Version
