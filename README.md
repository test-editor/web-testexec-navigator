# web-testexec-navigator

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

[npm-image]: https://badge.fury.io/js/%40testeditor%2Ftestexec-navigator.svg
[npm-url]: https://www.npmjs.com/package/@testeditor/testexec-navigator
[travis-image]: https://travis-ci.org/test-editor/web-testexec-navigator.svg?branch=master
[travis-url]: https://travis-ci.org/test-editor/web-testexec-navigator


Test-Editor test execution navigator gui angular component

# TestexecNavigator

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.7.4.

## Setup development

Make sure to have a working [nix](https://nixos.org/nix/) installation. Please ensure that the `nixpkgs-unstable` channel is available. It
can be added with `nix-channel --add https://nixos.org/channels/nixpkgs-unstable`.

To enter the development environment, execute `NIXPKGS_ALLOW_UNFREE=1 nix-shell` in this repos root directory. For even more convenience,
please install [direnv](https://github.com/direnv/direnv) which will enter the development environment automatically for you.

Once within the development environment, run `yarn install` to resolve all necessary dependencies.

## Development server

Run `yarn run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `yarn run build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

## Running unit tests

Run `yarn run test` or `yarn run test:once` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `yarn run e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).
If there is a locally installed chrome version, it might conflict with the version used within this project. This is due to some quirky resolution strategy of the karma-chrome-launcher. One way to work around this issue is to make the locally installed chrome version inaccessible (e.g. rename its folder, remove it from the path). Since e2e tests are not run that often, this inconvenience isn't that bothersome.

## Running the linter

Run `yarn run lint` to execute the linter for the project.

## Packaging as library

Run `yarn run packagr` to bundle the library into the dist folder via [ng-packagr](https://www.npmjs.com/package/ng-packagr)

## Automatic release process

Accepting a pullrequest, which essentially is merged into the master, will automatically publish a new (patch) version of this package to npm (see [npm-registry](https://www.npmjs.com/package/@testeditor/testexec-navigator))

## Manual release process

In order to create a release, the (minor) version needs to be increased and tagged. Checkout the master branch, make sure no local changes are present. Execute `yarn version`, for example:

```
yarn version --minor
```

After the commit and tag is pushed Travis will automatically publish the tagged version.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
Description of angular library packaging go [here](https://medium.com/@nikolasleblanc/building-an-angular-4-component-library-with-the-angular-cli-and-ng-packagr-53b2ade0701e)
