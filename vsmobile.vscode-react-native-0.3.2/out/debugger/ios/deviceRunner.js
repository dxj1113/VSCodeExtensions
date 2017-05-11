// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const Q = require("q");
const node_1 = require("../../common/node/node");
const plistBuddy_1 = require("../../common/ios/plistBuddy");
class DeviceRunner {
    constructor(projectRoot) {
        this.childProcess = new node_1.Node.ChildProcess();
        this.projectRoot = projectRoot;
        process.on("exit", () => this.cleanup());
    }
    run() {
        const proxyPort = 9999;
        const appLaunchStepTimeout = 10000;
        return new plistBuddy_1.PlistBuddy().getBundleId(this.projectRoot, /*simulator=*/ false)
            .then((bundleId) => this.getPathOnDevice(bundleId))
            .then((path) => this.startNativeDebugProxy(proxyPort).then(() => this.startAppViaDebugger(proxyPort, path, appLaunchStepTimeout)))
            .then(() => { });
    }
    // Attempt to start the app on the device, using the debug server proxy on a given port.
    // Returns a socket speaking remote gdb protocol with the debug server proxy.
    startAppViaDebugger(portNumber, packagePath, appLaunchStepTimeout) {
        const encodedPath = this.encodePath(packagePath);
        // We need to send 3 messages to the proxy, waiting for responses between each message:
        // A(length of encoded path),0,(encoded path)
        // Hc0
        // c
        // We expect a '+' for each message sent, followed by a $OK#9a to indicate that everything has worked.
        // For more info, see http://www.opensource.apple.com/source/lldb/lldb-167.2/docs/lldb-gdb-remote.txt
        const socket = new net.Socket();
        let initState = 0;
        let endStatus = null;
        let endSignal = null;
        const deferred1 = Q.defer();
        const deferred2 = Q.defer();
        socket.on("data", (data) => {
            data = data.toString();
            while (data[0] === "+") {
                data = data.substring(1);
            }
            // Acknowledge any packets sent our way
            if (data[0] === "$") {
                socket.write("+");
                if (data[1] === "W") {
                    // The app process has exited, with hex status given by data[2-3]
                    let status = parseInt(data.substring(2, 4), 16);
                    endStatus = status;
                    socket.end();
                }
                else if (data[1] === "X") {
                    // The app rocess exited because of signal given by data[2-3]
                    let signal = parseInt(data.substring(2, 4), 16);
                    endSignal = signal;
                    socket.end();
                }
                else if (data.substring(1, 3) === "OK") {
                    // last command was received OK;
                    if (initState === 1) {
                        deferred1.resolve(socket);
                    }
                    else if (initState === 2) {
                        deferred2.resolve(socket);
                    }
                }
                else if (data[1] === "O") {
                    // STDOUT was written to, and the rest of the input until reaching a "#" is a hex-encoded string of that output
                }
                else if (data[1] === "E") {
                    // An error has occurred, with error code given by data[2-3]: parseInt(data.substring(2, 4), 16)
                    const error = new Error("Unable to launch application.");
                    deferred1.reject(error);
                    deferred2.reject(error);
                }
            }
        });
        socket.on("end", function () {
            const error = new Error("Unable to launch application.");
            deferred1.reject(error);
            deferred2.reject(error);
        });
        socket.on("error", function (err) {
            deferred1.reject(err);
            deferred2.reject(err);
        });
        socket.connect(portNumber, "localhost", () => {
            // set argument 0 to the (encoded) path of the app
            const cmd = this.makeGdbCommand("A" + encodedPath.length + ",0," + encodedPath);
            initState++;
            socket.write(cmd);
            setTimeout(function () {
                deferred1.reject(new Error("Timeout launching application. Is the device locked?"));
            }, appLaunchStepTimeout);
        });
        return deferred1.promise.then((sock) => {
            // Set the step and continue thread to any thread
            const cmd = this.makeGdbCommand("Hc0");
            initState++;
            sock.write(cmd);
            setTimeout(function () {
                deferred2.reject(new Error("Timeout launching application. Is the device locked?"));
            }, appLaunchStepTimeout);
            return deferred2.promise;
        }).then((sock) => {
            // Continue execution; actually start the app running.
            const cmd = this.makeGdbCommand("c");
            initState++;
            sock.write(cmd);
            return;
        }).then(() => packagePath);
    }
    encodePath(packagePath) {
        // Encode the path by converting each character value to hex
        return packagePath.split("").map((c) => c.charCodeAt(0).toString(16)).join("").toUpperCase();
    }
    cleanup() {
        if (this.nativeDebuggerProxyInstance) {
            this.nativeDebuggerProxyInstance.kill("SIGHUP");
            this.nativeDebuggerProxyInstance = null;
        }
    }
    startNativeDebugProxy(proxyPort) {
        this.cleanup();
        return this.mountDeveloperImage().then(() => {
            let result = this.childProcess.spawn("idevicedebugserverproxy", [proxyPort.toString()]);
            result.outcome.done(() => { }, () => { }); // Q prints a warning if we don't call .done(). We ignore all outcome errors
            return result.startup.then(() => this.nativeDebuggerProxyInstance = result.spawnedProcess);
        });
    }
    mountDeveloperImage() {
        return this.getDiskImage().then((path) => {
            const imagemounter = this.childProcess.spawn("ideviceimagemounter", [path]).spawnedProcess;
            const deferred = Q.defer();
            let stdout = "";
            imagemounter.stdout.on("data", function (data) {
                stdout += data.toString();
            });
            imagemounter.on("exit", function (code) {
                if (code !== 0) {
                    if (stdout.indexOf("Error:") !== -1) {
                        deferred.resolve(void 0); // Technically failed, but likely caused by the image already being mounted.
                    }
                    else if (stdout.indexOf("No device found, is it plugged in?") !== -1) {
                        deferred.reject(new Error("Unable to find device. Is the device plugged in?"));
                    }
                    deferred.reject(new Error("Unable to mount developer disk image."));
                }
                else {
                    deferred.resolve(void 0);
                }
            });
            imagemounter.on("error", function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        });
    }
    getDiskImage() {
        const nodeChildProcess = this.childProcess;
        // Attempt to find the OS version of the iDevice, e.g. 7.1
        const versionInfo = nodeChildProcess.exec("ideviceinfo -s -k ProductVersion").outcome.then((stdout) => {
            return stdout.toString().trim().substring(0, 3); // Versions for DeveloperDiskImage seem to be X.Y, while some device versions are X.Y.Z
            // NOTE: This will almost certainly be wrong in the next few years, once we hit version 10.0
        }, function () {
            throw new Error("Unable to get device OS version");
        });
        // Attempt to find the path where developer resources exist.
        const pathInfo = nodeChildProcess.exec("xcrun -sdk iphoneos --show-sdk-platform-path").outcome.then((stdout) => {
            return stdout.toString().trim();
        });
        // Attempt to find the developer disk image for the appropriate
        return Q.all([versionInfo, pathInfo]).spread(function (version, sdkpath) {
            const find = nodeChildProcess.spawn("find", [sdkpath, "-path", "*" + version + "*", "-name", "DeveloperDiskImage.dmg"]).spawnedProcess;
            const deferred = Q.defer();
            find.stdout.on("data", function (data) {
                const dataStr = data.toString();
                const path = dataStr.split("\n")[0].trim();
                if (!path) {
                    deferred.reject(new Error("Unable to find developer disk image"));
                }
                else {
                    deferred.resolve(path);
                }
            });
            find.on("exit", function (code) {
                deferred.reject(new Error("Unable to find developer disk image"));
            });
            return deferred.promise;
        });
    }
    getPathOnDevice(packageId) {
        const nodeChildProcess = this.childProcess;
        const nodeFileSystem = new node_1.Node.FileSystem();
        return nodeChildProcess.execToString("ideviceinstaller -l -o xml > /tmp/$$.ideviceinstaller && echo /tmp/$$.ideviceinstaller")
            .catch(function (err) {
            if (err.code === "ENOENT") {
                throw new Error("Unable to find ideviceinstaller.");
            }
            throw err;
        }).then((stdout) => {
            // First find the path of the app on the device
            let filename = stdout.trim();
            if (!/^\/tmp\/[0-9]+\.ideviceinstaller$/.test(filename)) {
                throw new Error("Unable to list installed applications on device");
            }
            const plistBuddy = new plistBuddy_1.PlistBuddy();
            // Search thrown the unknown-length array until we find the package
            const findPackageEntry = (index) => {
                return plistBuddy.readPlistProperty(filename, `:${index}:CFBundleIdentifier`)
                    .then((bundleId) => {
                    if (bundleId === packageId) {
                        return plistBuddy.readPlistProperty(filename, `:${index}:Path`);
                    }
                    return findPackageEntry(index + 1);
                });
            };
            return findPackageEntry(0)
                .finally(() => {
                nodeFileSystem.unlink(filename);
            }).catch(() => {
                throw new Error("Application not installed on the device");
            });
        });
    }
    makeGdbCommand(command) {
        let commandString = `$${command}#`;
        let stringSum = 0;
        for (let i = 0; i < command.length; i++) {
            stringSum += command.charCodeAt(i);
        }
        /* tslint:disable:no-bitwise */
        // We need some bitwise operations to calculate the checksum
        stringSum = stringSum & 0xFF;
        /* tslint:enable:no-bitwise */
        let checksum = stringSum.toString(16).toUpperCase();
        if (checksum.length < 2) {
            checksum = "0" + checksum;
        }
        commandString += checksum;
        return commandString;
    }
}
exports.DeviceRunner = DeviceRunner;

//# sourceMappingURL=deviceRunner.js.map
