// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Q = require("q");
const path = require("path");
const WebSocket = require("ws");
const events_1 = require("events");
const packager_1 = require("../common/packager");
const errorHelper_1 = require("../common/error/errorHelper");
const log_1 = require("../common/log/log");
const logHelper_1 = require("../common/log/logHelper");
const executionsLimiter_1 = require("../common/executionsLimiter");
const fileSystem_1 = require("../common/node/fileSystem");
const forkedAppWorker_1 = require("./forkedAppWorker");
const scriptImporter_1 = require("./scriptImporter");
function printDebuggingError(message, reason) {
    log_1.Log.logWarning(errorHelper_1.ErrorHelper.getNestedWarning(reason, `${message}. Debugging won't work: Try reloading the JS from inside the app, or Reconnect the VS Code debugger`));
}
/** This class will create a SandboxedAppWorker that will run the RN App logic, and then create a socket
 * and send the RN App messages to the SandboxedAppWorker. The only RN App message that this class handles
 * is the prepareJSRuntime, which we reply to the RN App that the sandbox was created successfully.
 * When the socket closes, we'll create a new SandboxedAppWorker and a new socket pair and discard the old ones.
 */
class MultipleLifetimesAppWorker extends events_1.EventEmitter {
    constructor(packagerPort, sourcesStoragePath, { webSocketConstructor = (url) => new WebSocket(url), } = {}) {
        super();
        this.executionLimiter = new executionsLimiter_1.ExecutionsLimiter();
        this.nodeFileSystem = new fileSystem_1.FileSystem();
        this.packagerPort = packagerPort;
        this.sourcesStoragePath = sourcesStoragePath;
        console.assert(!!this.sourcesStoragePath, "The sourcesStoragePath argument was null or empty");
        this.webSocketConstructor = webSocketConstructor;
        this.scriptImporter = new scriptImporter_1.ScriptImporter(packagerPort, sourcesStoragePath);
    }
    start(retryAttempt = false) {
        return packager_1.Packager.isPackagerRunning(packager_1.Packager.getHostForPort(this.packagerPort))
            .then(running => {
            if (!running) {
                throw new Error(`Cannot attach to packager. Are you sure there is a packager and it is running in the port ${this.packagerPort}? If your packager is configured to run in another port make sure to add that to the setting.json.`);
            }
        })
            .then(() => {
            // Don't fetch debugger worker on socket disconnect
            return retryAttempt ? Q.resolve(void 0) :
                this.downloadAndPatchDebuggerWorker();
        })
            .then(() => this.createSocketToApp(retryAttempt));
    }
    stop() {
        if (this.socketToApp) {
            this.socketToApp.removeAllListeners();
            this.socketToApp.close();
        }
        if (this.singleLifetimeWorker) {
            this.singleLifetimeWorker.stop();
        }
    }
    downloadAndPatchDebuggerWorker() {
        let scriptToRunPath = path.resolve(this.sourcesStoragePath, scriptImporter_1.ScriptImporter.DEBUGGER_WORKER_FILENAME);
        return this.scriptImporter.downloadDebuggerWorker(this.sourcesStoragePath)
            .then(() => this.nodeFileSystem.readFile(scriptToRunPath, "utf8"))
            .then((workerContent) => {
            // Add our customizations to debugger worker to get it working smoothly
            // in Node env and polyfill WebWorkers API over Node's IPC.
            const modifiedDebuggeeContent = [MultipleLifetimesAppWorker.WORKER_BOOTSTRAP,
                workerContent, MultipleLifetimesAppWorker.WORKER_DONE].join("\n");
            return this.nodeFileSystem.writeFile(scriptToRunPath, modifiedDebuggeeContent);
        });
    }
    startNewWorkerLifetime() {
        this.singleLifetimeWorker = new forkedAppWorker_1.ForkedAppWorker(this.packagerPort, this.sourcesStoragePath, (message) => {
            this.sendMessageToApp(message);
        });
        log_1.Log.logInternalMessage(logHelper_1.LogLevel.Info, "A new app worker lifetime was created.");
        return this.singleLifetimeWorker.start()
            .then(startedEvent => {
            this.emit("connected", startedEvent);
        });
    }
    createSocketToApp(retryAttempt = false) {
        let deferred = Q.defer();
        this.socketToApp = this.webSocketConstructor(this.debuggerProxyUrl());
        this.socketToApp.on("open", () => {
            this.onSocketOpened();
        });
        this.socketToApp.on("close", () => {
            this.executionLimiter.execute("onSocketClose.msg", /*limitInSeconds*/ 10, () => {
                /*
                 * It is not the best idea to compare with the message, but this is the only thing React Native gives that is unique when
                 * it closes the socket because it already has a connection to a debugger.
                 * https://github.com/facebook/react-native/blob/588f01e9982775f0699c7bfd56623d4ed3949810/local-cli/server/util/webSocketProxy.js#L38
                 */
                let msgKey = "_closeMessage";
                if (this.socketToApp[msgKey] === "Another debugger is already connected") {
                    deferred.reject(new RangeError("Another debugger is already connected to packager. Please close it before trying to debug with VSCode."));
                }
                log_1.Log.logMessage("Disconnected from the Proxy (Packager) to the React Native application. Retrying reconnection soon...");
            });
            setTimeout(() => {
                this.start(true /* retryAttempt */);
            }, 100);
        });
        this.socketToApp.on("message", (message) => this.onMessage(message));
        this.socketToApp.on("error", (error) => {
            if (retryAttempt) {
                log_1.Log.logWarning(errorHelper_1.ErrorHelper.getNestedWarning(error, "Reconnection to the proxy (Packager) failed. Please check the output window for Packager errors, if any. If failure persists, please restart the React Native debugger."));
            }
            deferred.reject(error);
        });
        // In an attempt to catch failures in starting the packager on first attempt,
        // wait for 300 ms before resolving the promise
        Q.delay(300).done(() => deferred.resolve(void 0));
        return deferred.promise;
    }
    debuggerProxyUrl() {
        return `ws://${packager_1.Packager.getHostForPort(this.packagerPort)}/debugger-proxy?role=debugger&name=vscode`;
    }
    onSocketOpened() {
        this.executionLimiter.execute("onSocketOpened.msg", /*limitInSeconds*/ 10, () => log_1.Log.logMessage("Established a connection with the Proxy (Packager) to the React Native application"));
    }
    killWorker() {
        if (!this.singleLifetimeWorker)
            return;
        this.singleLifetimeWorker.stop();
        this.singleLifetimeWorker = null;
    }
    onMessage(message) {
        try {
            log_1.Log.logInternalMessage(logHelper_1.LogLevel.Trace, "From RN APP: " + message);
            let object = JSON.parse(message);
            if (object.method === "prepareJSRuntime") {
                // In RN 0.40 Android runtime doesn't seem to be sending "$disconnected" event
                // when user reloads an app, hence we need to try to kill it here either.
                this.killWorker();
                // The MultipleLifetimesAppWorker will handle prepareJSRuntime aka create new lifetime
                this.gotPrepareJSRuntime(object);
            }
            else if (object.method === "$disconnected") {
                // We need to shutdown the current app worker, and create a new lifetime
                this.killWorker();
            }
            else if (object.method) {
                // All the other messages are handled by the single lifetime worker
                this.singleLifetimeWorker.postMessage(object);
            }
            else {
                // Message doesn't have a method. Ignore it. This is an info message instead of warn because it's normal and expected
                log_1.Log.logInternalMessage(logHelper_1.LogLevel.Info, "The react-native app sent a message without specifying a method: " + message);
            }
        }
        catch (exception) {
            printDebuggingError(`Failed to process message from the React Native app. Message:\n${message}`, exception);
        }
    }
    gotPrepareJSRuntime(message) {
        // Create the sandbox, and replay that we finished processing the message
        this.startNewWorkerLifetime().done(() => {
            this.sendMessageToApp({ replyID: parseInt(message.id, 10) });
        }, error => printDebuggingError(`Failed to prepare the JavaScript runtime environment. Message:\n${message}`, error));
    }
    sendMessageToApp(message) {
        let stringified = null;
        try {
            stringified = JSON.stringify(message);
            log_1.Log.logInternalMessage(logHelper_1.LogLevel.Trace, "To RN APP: " + stringified);
            this.socketToApp.send(stringified);
        }
        catch (exception) {
            let messageToShow = stringified || ("" + message); // Try to show the stringified version, but show the toString if unavailable
            printDebuggingError(`Failed to send message to the React Native app. Message:\n${messageToShow}`, exception);
        }
    }
}
MultipleLifetimesAppWorker.WORKER_BOOTSTRAP = `
// Initialize some variables before react-native code would access them
var onmessage=null, self=global;
// Cache Node's original require as __debug__.require
global.__debug__={require: require};
// avoid Node's GLOBAL deprecation warning
Object.defineProperty(global, "GLOBAL", {
    configurable: true,
    writable: true,
    enumerable: true,
    value: global
});
process.on("message", function(message){
    if (onmessage) onmessage(message);
});
var postMessage = function(message){
    process.send(message);
};
var importScripts = (function(){
    var fs=require('fs'), vm=require('vm');
    return function(scriptUrl){
        var scriptCode = fs.readFileSync(scriptUrl, "utf8");
        vm.runInThisContext(scriptCode, {filename: scriptUrl});
    };
})();`;
MultipleLifetimesAppWorker.WORKER_DONE = `// Notify debugger that we're done with loading
// and started listening for IPC messages
postMessage({workerLoaded:true});`;
exports.MultipleLifetimesAppWorker = MultipleLifetimesAppWorker;

//# sourceMappingURL=appWorker.js.map