# affiance

A tool to manage and configure [Git hooks](http://git-scm.com/book/en/Customizing-Git-Git-Hooks)

Inspired by and shamelessly ported from [Overcommit](https://github.com/brigade/overcommit).

In addition to supporting a wide variety of hooks that can be used across
multiple repositories, you can also define hooks specific to a
repository, but, unlike regular Git hooks, are stored in source control. You can
also easily [add your existing hook scripts](#adding-existing-git-hooks) without
writing any Javascript code.

* [Definition](#definition)
* [Requirements](#requirements)
  * [Dependencies](#dependencies)
* [Limitations](#limitations)
* [Installation](#installation)
* [Usage](#usage)
* [Configuration](#configuration)
  * [Hook Options](#hook-options)
  * [Hook Categories](#hook-categories)
  * [Plugin Directory](#plugin-directory)
  * [Signature Verification](#signature-verification)
* [Built-In Hooks](#built-in-hooks)
  * [CommitMsg](#commitmsg)
  * [PostCheckout](#postcheckout)
  * [PostCommit](#postcommit)
  * [PostMerge](#postmerge)
  * [PostRewrite](#postrewrite)
  * [PreCommit](#precommit)
  * [PrePush](#prepush)
  * [PreRebase](#prerebase)
* [Repo-Specific Hooks](#repo-specific-hooks)
  * [Adding Existing Git Hooks](#adding-existing-git-hooks)
* [Security](#security)
* [Contributing](#contributing)
* [Community](#community)
* [Changelog](#changelog)
* [License](#license)

## Definition
### _affiance_
>_v._ to pledge by promise of marriage; betroth.<br/>
>_n._ trust; confidence; reliance.

## Requirements

This project aims to support the following node versions runtimes on \*nix machines:
* Node 4+

Windows is not yet supported, but could be with your help!

### Dependencies

Some of the hooks have third-party dependencies. For example, to lint your
[STYL](http://stylus-lang.com/) files, you're going to need the
[stylint](https://github.com/SimenB/stylint) module.

Depending on the hooks you enable/disable for your repository, you'll need to
ensure your development environment already has those dependencies installed.
Most hooks will display a warning if a required executable isn't available.

## Limitations

Affiance does not currently support
[`git-worktree`](https://git-scm.com/docs/git-worktree).

## Installation

`affiance` is installed via [npm](https://www.npmjs.com/). It is strongly
recommended that your environment support running `npm install` without
requiring `sudo` privileges. Using a Node version manager like
[`nvm`](https://github.com/creationix/nvm/blob/master/README.markdown) can help
here.

Once you have an environment that allows you to install gems without `sudo`,
you can run the following command to make affiance available globally:

### Global installation
```bash
npm install -g affiance
```

If Affiance is installed globally, the cli binary will be in your PATH.
In any repo existing repo, run the following to install the affiance.

```bash
cd ~/important-project
affiance install
affiance sign # See Security section below for explanation
```

### Repo specific installation

Like most npm modules, Affiance can (and usually should) be installed locally. In a team
context where multiple repos are involved, using global modules is not sustainable
as each repo may have different requirements.
The caveat is that if Affiance is not installed globally, the binary from the
`./node_modules/.bin` directory must be used to run the various installation
commands.
Affiance assumes this is the default, so all error messages from affiance will
encourage you to run the command from the local binary instead of the global
binary. Affiance also opinionatedly assumes that other node modules will be installed
locally. If you want to use the global binary, change the `requiredExecutable` property
of the hook in question.

```bash
mkdir important-project
cd important-project
git init
npm init # Create a package.json and name the module
npm install affiance --save-dev # Save `affiance` to devDependencies in package.json
./node_modules/.bin/affiance install
./node_modules/.bin/affiance sign # See Security section below for explanation
```

See the [Security](#security) section of the documentation to understand why
`affiance sign` is necessary after installing hooks for the first time.

After running `affiance install`, any existing hooks for your repository
which Affiance will replace will be backed up. You can restore everything to
the way it was by running `affiance uninstall`.

## Usage

Once you've installed the hooks via `affiance install`, they will
automatically run when the appropriate hook is triggered.

The `affiance` executable supports the following subcommands:

Subcommand         | Description
-------------------|----------------------------------------------------
`install`          | Install Affiance hooks in a repository
`uninstall`        | Remove Affiance hooks from a repository
`version`          | Show version of affiance
`-h` / `-help`     | Show subcommand flag documentation

### Skipping Hooks

Sometimes a hook will report an error that for one reason or another you'll want
to ignore. To prevent these errors from blocking your commit, you can include
the name of the relevant hook in the `SKIP` environment variable, e.g.

```bash
SKIP=EsLint git commit
```

If you would prefer to specify a whitelist of hooks rather than a blacklist, use
the `ONLY` environment variable instead.

```bash
ONLY=EsLint git commit
```

Use this feature sparingly, as there is no point to having the hook in the first
place if you're just going to ignore it. If you want to ensure a hook is never
skipped, set the `required` option to `true` in its configuration. If you
attempt to skip it, you'll see a warning telling you that the hook is required,
and the hook will still run.

### Disabling Affiance

If you have scripts that execute `git` commands where you don't want Affiance
hooks to run, you can disable Affiance entirely by setting the
`AFFIANCE_DISABLE` environment variable.

```bash
AFFIANCE_DISABLE=1 ./my-custom-script
```

## Configuration

Affiance provides a flexible configuration system that allows you to tailor
the built-in hooks to suit your workflow. All configuration specific to a
repository is stored in `.affiance.yml` in the top-level directory of the
repository.

When writing your own configuration, it will automatically extend the
[default configuration](config/default.yml), so you only need to specify
your configuration with respect to the default. In order to
enable/disable hooks, you can add the following to your repo-specific
configuration file:

```yaml
PreCommit:
  RuboCop:
    enabled: true
    command: ['bundle', 'exec', 'rubocop'] # Invoke within Bundler context
```

### Hook Options

Individual hooks expose both built-in configuration options as well as their
own custom options unique to each hook. The following table lists all built-in
configuration options:

Option                                  | Description
----------------------------------------|--------------------------------------
`enabled`                               | If `false`, this hook will never be run
`required`                              | If `true`, this hook cannot be skipped via the `SKIP` environment variable
`quiet`                                 | If `true`, this hook does not display any output unless it warns/fails
`description`                           | Message displayed while hook is running.
`requires_files`                        | If `true`, this hook runs only if files that are applicable to it have been modified. See `include` and `exclude` for how to specify applicable files.
`include`                               | File paths or glob patterns of files that apply to this hook. The hook will only run on the applicable files when they have been modified. Note that the concept of modified varies for different types of hooks. By default, `include` matches every file until you specify a list of patterns.
`exclude`                               | File paths or glob patterns of files that do not apply to this hook. This is used to exclude any files that would have been matched by `include`.
`problemOnUnmodifiedLine`               | How to treat errors reported on lines that weren't modified during the action captured by this hook (e.g. for pre-commit hooks, warnings/errors reported on lines that were not staged with `git add` may not be warnings/errors you care about). Valid values are `report`: report errors/warnings as-is regardless of line location (default); `warn`: report errors as warnings if they are on lines you didn't modify; and `ignore`: don't display errors/warnings at all if they are on lines you didn't modify (`ignore` is _not_ recommended).
`onFail`                                | Change the status of a failed hook to `warn` or `pass`. This allows you to treat failures as warnings or potentially ignore them entirely, but you should use caution when doing so as you might be hiding important information.
`onWarn`                                | Similar to `on_fail`, change the status of a hook that returns a warning status to either `pass` (you wish to silence warnings entirely) or `fail` (you wish to treat all warnings as errors).
`requiredExecutable`                    | Name of an executable that must exist in order for the hook to run. If this is a path (e.g. `./bin/ruby`), ensures that the executable file exists at the given location relative to the repository root. Otherwise, if it just the name of an executable (e.g. `ruby`) checks if the executable can be found in one of the directories in the `PATH` environment variable. Set this to a specific path if you want to always use an executable that is stored in your repository. (e.g. RubyGems bin stubs, Node.js binaries, etc.)
`requiredLibrary`/`requiredLibraries`   | List of Ruby libraries to load with `Kernel.require` before the hook runs. This is specifically for hooks that integrate with external Ruby libraries.
`command`                               | Array of arguments to use as the command. How each hook uses this is different, but it allows hooks to change the context with which they run. For example, you can change the command to be `['bundle', 'exec', 'rubocop']` instead of just `rubocop` so that you can use the gem versions specified in your local `Gemfile.lock`. This defaults to the name of the `required_executable`.
`flags`                                 | Array of arguments to append to the `command`. This is useful for customizing the behavior of a tool. It's also useful when a newer version of a tool removes/renames existing flags, so you can update the flags via your `.affiance.yml` instead of waiting for an upstream fix in Affiance.
`env`                                   | Hash of environment variables the hook should be run with. This is intended to be used as a last resort when an executable a hook runs is configured only via an environment variable. Any pre-existing environment variables with the same names as ones defined in `env` will have their original values restored after the hook runs. **NOTE:** Currently, only strings are accepted values. Boolean values will raise an error. **WARNING**: If you set the same environment variable for multiple hooks and you've enabled parallel hook runs, since the environment is shared across all threads you could accidentally have these separate hooks trample on each other. In this case, you should disable parallelization for the hook using the `parallelize` option.
`parallelize`                           | Whether to allow this hook to be run concurrently with other hooks. Disable this if the hook requires access to a shared resource that other hooks may also access and modify (e.g. files, the git index, process environment variables, etc).
`processors`                            | The number of processing units to reserve for this hook. This does not reserve CPUs, but indicates that out of the total number of possible concurrent hooks allowed by the global `concurrency` option, this hook requires the specified number. Thus in the typical case where `concurrency` is set to the number of available cores (default), and you have a hook that executes an application which itself creates 2 threads (or is otherwise scheduled on 2 cores), you can indicate that Affiance should allocate 2 `processors` to the hook. Ideally this means your hooks won't put undue load on your available cores.
`installCommand`                        | Command the user can run to install the `required_executable` (or alternately the specified `required_libraries`). This is intended for documentation purposes, as Affiance does not install software on your behalf since there are too many edge cases where such behavior would result in incorrectly configured installations (e.g. installing a Python package in the global package space instead of in a virtual environment).
`skipFileCheckout`                      | Whether to skip this hook for file checkouts (e.g. `git checkout some-ref -- file`). Only applicable to `PostCheckout` hooks.

In addition to the built-in configuration options, each hook can expose its
own unique configuration options. The `AuthorEmail` hook, for example, allows
you to customize the regex used to check commit author emails via the `pattern`
option&mdash;useful if you want to enforce that developers use a company
email address for their commits. This provides incredible flexibility for hook
authors as you can make your hooks sufficiently generic and then customize them
on a per-project basis.

#### The `ALL` Hook

Within a hook category, there is a special type of hook configuration that
applies to _all_ hooks in the category. This configuration looks like a normal
hook configuration, except it has the name `ALL`:

```yaml
PreCommit:
  ALL:
    problemOnUnmodifiedLine: warn
    requiresFiles: true
    required: false
    quiet: false

  SomeHook:
    enabled: true

  ...
```

The `ALL` configuration is useful for when you want to
[DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself) up your
configuration, or when you want to apply changes across an entire category of
hooks.

Note that array configuration options (like `include`/`exclude`) in the
special `ALL` hook section are not merged with individual hook configurations
if custom ones are defined for the hook.
Any custom configuration option for `include`/`exclude` will replace the `ALL`
hook's configuration. If you want to have a global list of default exclusions
and extend them with a custom list, you can use YAML references, e.g.

```yaml
PreCommit:
  ALL:
    exclude: &defaultExcludes
      - 'node_modules/**/*'
      - 'vendor/**/*'
  MyHook:
    exclude:
      - *defaultExcludes
      - 'another/directory/in/addition/to/default/excludes/**/*'
```

Again, you can consult the [default configuration](config/default.yml) for
detailed examples of how the `ALL` hook can be used.

### Plugin Directory

You can change the directory that project-specific hooks are loaded from via
the `plugin_directory` option. The default directory is `.git-hooks`.

### Quiet Hook Runs

If you prefer to have your hooks be completely silent unless there is a
problem, you can set the top-level `quiet` option to `true`. Note that if you
have many hooks or slow hooks this may not be desirable, as you don't get
visual feedback indicating the general progress of the hook run.

### Concurrency

Affiance runs hooks in parallel by default, with a number of concurrent
workers equal to the number of logical cores on your machine. If you know your
particular set of hooks would benefit from higher/lower number of workers, you
can adjust the global `concurrency` option. You can define single-operator
mathematical expressions, e.g. `%{processors} * 2`, or `%{processors} / 2`.

```yaml
concurrency: '%{processors} / 4'
```

Note that individual hooks can specify the number of processors they require
with the `processors` hook option. See the [hook options](#hook-options)
section for more details.

### Signature Verification

You can disable manual verification of signatures by setting
`verify_signatures` to `false`. See the [Security](#security) section for more
information on this option and what exactly it controls.

## Built-In Hooks

Currently, Affiance supports the following hooks out of the box&mdash;simply
enable them in your `.affiance.yml`.

**Note**: Hooks with a `*` are enabled by default.

### CommitMsg

`commit-msg` hooks are run against every commit message you write before a
commit is created. A failed hook prevents a commit from being created. These
hooks are useful for enforcing policies on your commit messages, e.g. ensuring
a task ID is included for tracking purposes, or ensuring your commit messages
follow [proper formatting guidelines](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

* [`*`CapitalizedSubject](lib/hook/commit-msg/CapitalizedSubject.js)
* [`*`EmptyMessage](lib/hook/commit-msg/EmptyMessage.js)

### PostCheckout

`post-checkout` hooks run after a successful `git checkout`, or in other words
any time your `HEAD` changes or a file is explicitly checked out.

* [NpmInstall](lib/hook/post-checkout/NpmInstall.js)

### PostCommit

`post-commit` hooks run after a commit is successfully created. A hook failing
in this case does not prevent the commit since it has already occurred;
however, it can be used to alert the user to some issue.

* [NpmInstall](lib/hook/post-commit/NpmInstall.js)

### PostMerge

`post-merge` hooks run after a `git merge` executes successfully with no merge
conflicts. A hook failing in this case does not prevent the merge since it has
already occurred; however, it can be used to alert the user to some issue.

* [NpmInstall](lib/hook/post-merge/NpmInstall.js)

### PostRewrite

`post-rewrite` hooks run after a commit is modified by a `git commit --amend`
or `git rebase`. A hook failing in this case does not prevent the rewrite since
it has already occurred; however, it can be used to alert the user to some
issue.

* [NpmInstall](lib/hook/post-rewrite/NpmInstall.js)

### PreCommit

`pre-commit` hooks are run after `git commit` is executed, but before the
commit message editor is displayed. If a hook fails, the commit will not be
created. These hooks are ideal for syntax checkers, linters, and other checks
that you want to run before you allow a commit to even be created.

#### WARNING: pre-commit hooks cannot have side effects

`pre-commit` hooks currently do not support hooks with side effects (such as
modifying files and adding them to the index with `git add`). This is a
consequence of Affiance's pre-commit hook stashing behavior to ensure hooks
are run against _only the changes you are about to commit_.

Without Affiance, the proper way to write a `pre-commit` hook would be to
extract the staged changes into temporary files and lint those files
instead of whatever contents are in your working tree (as you don't want
unstaged changes to taint your results). Affiance takes care
of this for you, but to do it in a generalized way introduces this
limitation.

* [CoffeeLint](lib/hook/pre-commit/CoffeeLint.js)
* [EsLint](lib/hook/pre-commit/EsLint.js)
* [`*`MergeConflicts](lib/hook/pre-commit/MergeConflicts.js)
* [MochaOnly](lib/hook/pre-commit/MochaOnly.js)
* [StylusLint](lib/hook/pre-commit/StylusLint.js)

### PrePush

`pre-push` hooks are run during `git push`, after remote refs have been updated
but before any objects have been transferred. If a hook fails, the push is
aborted.

* [Mocha](lib/hook/pre-push/Mocha.js)

### PreRebase

`pre-rebase` hooks are run during `git rebase`, before any commits are rebased.
If a hook fails, the rebase is aborted.

* [MergedCommits](lib/hook/pre-rebase/MergedCommits.js)

## Repo-Specific hooks

Out of the box, `affiance` comes with a set of hooks that enforce a variety of
styles and lints. However, some hooks only make sense in the context of a
specific repository.

At Brigade, for example, we have a number of simple checks that we run
against our code to catch common errors. For example, since we use coffeescript
in development, we want to make sure all requires do not specify the file
extension of `.coffee` because those won't work when the code is compiled to
javascript.

Inside our repository, we can add the file
`.git-hooks/pre-commit/NoRequireCoffee.js` in order to automatically check
our that requires don't specify .coffee:

```coffee
fse =  require 'fse'
PreCommitBase = require 'affiance/lib/hook/pre-commit/Base'

module.exports = class NoRequireCoffee extends PreCommitBase
  run: ->
    errors = []
    @applicableFiles().forEach (filePath) ->
      if fse.readFileSync(filePath, 'utf8').match /require.*\.coffee/g
        errors.push "#{filePath}: has a require that specifies .coffee"
      end
    end

    return ['fail', errors.join("\n")] if errors.length
    return 'pass'
```

The corresponding configuration for this hook would look like:

```yaml
PreCommit:
  NoRequireCoffee:
    enabled: true
    description: 'Check for requires that specify the coffee extension'
    include: '**/*.coffee'
```

### Adding Existing Git Hooks

You might already have hook scripts written which you'd like to integrate with
Affiance right away. To make this easy, Affiance allows you to include
your hook script in your configuration without writing any Javascript code.
For example:

```yaml
PostCheckout:
  CustomScript:
    enabled: true
    requiredExecutable: './bin/custom-script'
```

So long as a command is given (either by specifying the `command` option
directly or specifying `required_executable`) a special hook is created that
executes the command and appends any arguments and standard input stream that
would have been passed to the regular hook. The hook passes or fails based
on the exit status of the command.

## Security

While Affiance can make managing Git hooks easier and more convenient,
this convenience can come at a cost of being less secure.

Since installing Affiance hooks will allow arbitrary plugin code in your
repository to be executed, you expose yourself to an attack where checking
out code from a third party can result in malicious code being executed
on your system.

As an example, consider the situation where you have an open source project.
An attacker could submit a pull request which adds a `post-checkout` hook
that executes some malicious code. When you fetch and checkout this pull
request, the `post-checkout` hook will be run on your machine, along with
the malicious code that you just checked out.

Affiance attempts to address this problem by storing a signature of your
configuration and all hook plugin code since the last time it ran. When the
signature changes, a warning is displayed alerting you to which plugins have
changed. It is then up to you to manually verify that the changes are not
malicious, and then continue running the hooks.

The signature is derived from the contents of the plugin's source code itself
and any configuration for the plugin. Thus a change to the plugin's source
code or your local repo's `.affiance.yml` file could result in a signature
change.

### Disabling Signature Checking

In typical usage, your plugins usually don't change too often, so this warning
should not become a nuisance. However, users who work within proprietary
repositories where all developers who can push changes to the repository
already have a minimum security clearance may wish to disable this check.

While not recommended, you can disable signature verification by setting
`verifySignatures` to `false` in your `.affiance.yml` file.

**Regardless of whether you have `verifySignatures` disabled for your project,
if you are running Affiance for the first time you will need to sign your
configuration with `affiance sign`**. This needs to happen once so
Affiance can record in your local git repo's configuration (outside of source
control) that you intend to enable/disable verification. This way if someone
else changes `verifySignatures` you'll be asked to confirm the change.

## Contributing

I love contributions to Affiance, be they bug reports, feature ideas, or
pull requests. See our [guidelines for contributing](CONTRIBUTING.md) to best
ensure your thoughts, ideas, or code get merged.

## Community

All major discussion surrounding Affiance happens on the
[GitHub issues list](https://github.com/l8on/affiance/issues).

You can also follow [@l8on on Twitter](https://twitter.com/l8on). Maybe someday
the community will be big enough to warrant its own Twitter account.

## Changelog

If you're interested in seeing the changes and bug fixes between each version
of `affiance`, read the [Affiance Changelog](CHANGELOG.md).

## License

This project is released under the [MIT license](MIT-LICENSE).
