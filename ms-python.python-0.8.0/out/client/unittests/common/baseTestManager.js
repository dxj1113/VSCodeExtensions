"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// import {TestFolder, TestsToRun, Tests, TestFile, TestSuite, TestFunction, TestStatus, FlattenedTestFunction, FlattenedTestSuite, CANCELLATION_REASON} from './contracts';
const vscode = require("vscode");
const vscode_1 = require("vscode");
const configSettings_1 = require("../../common/configSettings");
const helpers_1 = require("../../common/helpers");
const installer_1 = require("../../common/installer");
const constants_1 = require("../../telemetry/constants");
const index_1 = require("../../telemetry/index");
const constants_2 = require("./constants");
const testUtils_1 = require("./testUtils");
const types_1 = require("./types");
var CancellationTokenType;
(function (CancellationTokenType) {
    CancellationTokenType[CancellationTokenType["testDiscovery"] = 0] = "testDiscovery";
    CancellationTokenType[CancellationTokenType["testRunner"] = 1] = "testRunner";
})(CancellationTokenType || (CancellationTokenType = {}));
class BaseTestManager {
    constructor(testProvider, product, rootDirectory, outputChannel, testCollectionStorage, testResultsService, testsHelper) {
        this.testProvider = testProvider;
        this.product = product;
        this.rootDirectory = rootDirectory;
        this.outputChannel = outputChannel;
        this.testCollectionStorage = testCollectionStorage;
        this.testResultsService = testResultsService;
        this.testsHelper = testsHelper;
        // tslint:disable-next-line:variable-name
        this._status = types_1.TestStatus.Unknown;
        this._status = types_1.TestStatus.Unknown;
        this.installer = new installer_1.Installer();
        this.settings = configSettings_1.PythonSettings.getInstance(this.rootDirectory ? vscode_1.Uri.file(this.rootDirectory) : undefined);
        this.workspace = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(this.rootDirectory)).uri;
    }
    get testDiscoveryCancellationToken() {
        return this.testDiscoveryCancellationTokenSource ? this.testDiscoveryCancellationTokenSource.token : undefined;
    }
    get testRunnerCancellationToken() {
        return this.testRunnerCancellationTokenSource ? this.testRunnerCancellationTokenSource.token : undefined;
    }
    dispose() {
        this.stop();
    }
    get status() {
        return this._status;
    }
    get workingDirectory() {
        const settings = configSettings_1.PythonSettings.getInstance(vscode.Uri.file(this.rootDirectory));
        return settings.unitTest.cwd && settings.unitTest.cwd.length > 0 ? settings.unitTest.cwd : this.rootDirectory;
    }
    stop() {
        if (this.testDiscoveryCancellationTokenSource) {
            this.testDiscoveryCancellationTokenSource.cancel();
        }
        if (this.testRunnerCancellationTokenSource) {
            this.testRunnerCancellationTokenSource.cancel();
        }
    }
    reset() {
        this._status = types_1.TestStatus.Unknown;
        this.tests = null;
    }
    resetTestResults() {
        if (!this.tests) {
            return;
        }
        this.testResultsService.resetResults(this.tests);
    }
    discoverTests(cmdSource, ignoreCache = false, quietMode = false, userInitiated = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.discoverTestsPromise) {
                return this.discoverTestsPromise;
            }
            if (!ignoreCache && this.tests && this.tests.testFunctions.length > 0) {
                this._status = types_1.TestStatus.Idle;
                return Promise.resolve(this.tests);
            }
            this._status = types_1.TestStatus.Discovering;
            // If ignoreCache is true, its an indication of the fact that its a user invoked operation.
            // Hence we can stop the debugger.
            if (userInitiated) {
                this.stop();
            }
            const telementryProperties = {
                tool: this.testProvider,
                // tslint:disable-next-line:no-any prefer-type-cast
                trigger: cmdSource,
                failed: false
            };
            this.createCancellationToken(CancellationTokenType.testDiscovery);
            return this.discoverTestsPromise = this.discoverTestsImpl(ignoreCache)
                .then(tests => {
                this.tests = tests;
                this._status = types_1.TestStatus.Idle;
                this.resetTestResults();
                this.discoverTestsPromise = null;
                // have errors in Discovering
                let haveErrorsInDiscovering = false;
                tests.testFiles.forEach(file => {
                    if (file.errorsWhenDiscovering && file.errorsWhenDiscovering.length > 0) {
                        haveErrorsInDiscovering = true;
                        this.outputChannel.append('_'.repeat(10));
                        this.outputChannel.append(`There was an error in identifying unit tests in ${file.nameToRun}`);
                        this.outputChannel.appendLine('_'.repeat(10));
                        this.outputChannel.appendLine(file.errorsWhenDiscovering);
                    }
                });
                if (haveErrorsInDiscovering && !quietMode) {
                    testUtils_1.displayTestErrorMessage('There were some errors in discovering unit tests');
                }
                const wkspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(this.rootDirectory)).uri;
                this.testCollectionStorage.storeTests(wkspace, tests);
                this.disposeCancellationToken(CancellationTokenType.testDiscovery);
                index_1.sendTelemetryEvent(constants_1.UNITTEST_DISCOVER, undefined, telementryProperties);
                return tests;
            }).catch(reason => {
                if (helpers_1.isNotInstalledError(reason) && !quietMode) {
                    // tslint:disable-next-line:no-floating-promises
                    this.installer.promptToInstall(this.product, this.workspace);
                }
                this.tests = null;
                this.discoverTestsPromise = null;
                if (this.testDiscoveryCancellationToken && this.testDiscoveryCancellationToken.isCancellationRequested) {
                    reason = constants_2.CANCELLATION_REASON;
                    this._status = types_1.TestStatus.Idle;
                }
                else {
                    telementryProperties.failed = true;
                    index_1.sendTelemetryEvent(constants_1.UNITTEST_DISCOVER, undefined, telementryProperties);
                    this._status = types_1.TestStatus.Error;
                    this.outputChannel.appendLine('Test Discovery failed: ');
                    // tslint:disable-next-line:prefer-template
                    this.outputChannel.appendLine('' + reason);
                }
                const wkspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(this.rootDirectory)).uri;
                this.testCollectionStorage.storeTests(wkspace, null);
                this.disposeCancellationToken(CancellationTokenType.testDiscovery);
                return Promise.reject(reason);
            });
        });
    }
    runTest(cmdSource, testsToRun, runFailedTests, debug) {
        const moreInfo = {
            Test_Provider: this.testProvider,
            Run_Failed_Tests: 'false',
            Run_Specific_File: 'false',
            Run_Specific_Class: 'false',
            Run_Specific_Function: 'false'
        };
        const telementryProperties = {
            tool: this.testProvider,
            scope: 'all',
            debugging: debug === true,
            trigger: cmdSource,
            failed: false
        };
        if (runFailedTests === true) {
            // tslint:disable-next-line:prefer-template
            moreInfo.Run_Failed_Tests = runFailedTests + '';
            telementryProperties.scope = 'failed';
        }
        if (testsToRun && typeof testsToRun === 'object') {
            if (Array.isArray(testsToRun.testFile) && testsToRun.testFile.length > 0) {
                telementryProperties.scope = 'file';
                moreInfo.Run_Specific_File = 'true';
            }
            if (Array.isArray(testsToRun.testSuite) && testsToRun.testSuite.length > 0) {
                telementryProperties.scope = 'class';
                moreInfo.Run_Specific_Class = 'true';
            }
            if (Array.isArray(testsToRun.testFunction) && testsToRun.testFunction.length > 0) {
                telementryProperties.scope = 'function';
                moreInfo.Run_Specific_Function = 'true';
            }
        }
        if (runFailedTests === false && testsToRun === null) {
            this.resetTestResults();
        }
        this._status = types_1.TestStatus.Running;
        if (this.testRunnerCancellationTokenSource) {
            this.testRunnerCancellationTokenSource.cancel();
        }
        // If running failed tests, then don't clear the previously build UnitTests
        // If we do so, then we end up re-discovering the unit tests and clearing previously cached list of failed tests
        // Similarly, if running a specific test or test file, don't clear the cache (possible tests have some state information retained)
        const clearDiscoveredTestCache = runFailedTests || moreInfo.Run_Specific_File || moreInfo.Run_Specific_Class || moreInfo.Run_Specific_Function ? false : true;
        return this.discoverTests(cmdSource, clearDiscoveredTestCache, true, true)
            .catch(reason => {
            if (this.testDiscoveryCancellationToken && this.testDiscoveryCancellationToken.isCancellationRequested) {
                return Promise.reject(reason);
            }
            testUtils_1.displayTestErrorMessage('Errors in discovering tests, continuing with tests');
            return {
                rootTestFolders: [], testFiles: [], testFolders: [], testFunctions: [], testSuites: [],
                summary: { errors: 0, failures: 0, passed: 0, skipped: 0 }
            };
        })
            .then(tests => {
            this.createCancellationToken(CancellationTokenType.testRunner);
            return this.runTestImpl(tests, testsToRun, runFailedTests, debug);
        }).then(() => {
            this._status = types_1.TestStatus.Idle;
            this.disposeCancellationToken(CancellationTokenType.testRunner);
            index_1.sendTelemetryEvent(constants_1.UNITTEST_RUN, undefined, telementryProperties);
            return this.tests;
        }).catch(reason => {
            if (this.testRunnerCancellationToken && this.testRunnerCancellationToken.isCancellationRequested) {
                reason = constants_2.CANCELLATION_REASON;
                this._status = types_1.TestStatus.Idle;
            }
            else {
                this._status = types_1.TestStatus.Error;
                telementryProperties.failed = true;
                index_1.sendTelemetryEvent(constants_1.UNITTEST_RUN, undefined, telementryProperties);
            }
            this.disposeCancellationToken(CancellationTokenType.testRunner);
            return Promise.reject(reason);
        });
    }
    createCancellationToken(tokenType) {
        this.disposeCancellationToken(tokenType);
        if (tokenType === CancellationTokenType.testDiscovery) {
            this.testDiscoveryCancellationTokenSource = new vscode.CancellationTokenSource();
        }
        else {
            this.testRunnerCancellationTokenSource = new vscode.CancellationTokenSource();
        }
    }
    disposeCancellationToken(tokenType) {
        if (tokenType === CancellationTokenType.testDiscovery) {
            if (this.testDiscoveryCancellationTokenSource) {
                this.testDiscoveryCancellationTokenSource.dispose();
            }
            this.testDiscoveryCancellationTokenSource = null;
        }
        else {
            if (this.testRunnerCancellationTokenSource) {
                this.testRunnerCancellationTokenSource.dispose();
            }
            this.testRunnerCancellationTokenSource = null;
        }
    }
}
exports.BaseTestManager = BaseTestManager;
//# sourceMappingURL=baseTestManager.js.map