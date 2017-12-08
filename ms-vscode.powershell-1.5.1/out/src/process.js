"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const utils = require("./utils");
const vscode = require("vscode");
class PowerShellProcess {
    constructor(exePath, title, log, startArgs, sessionFilePath, sessionSettings) {
        this.exePath = exePath;
        this.title = title;
        this.log = log;
        this.startArgs = startArgs;
        this.sessionFilePath = sessionFilePath;
        this.sessionSettings = sessionSettings;
        this.consoleTerminal = undefined;
        this.onExitedEmitter = new vscode.EventEmitter();
        this.onExited = this.onExitedEmitter.event;
    }
    start(logFileName) {
        return new Promise((resolve, reject) => {
            try {
                let startScriptPath = path.resolve(__dirname, '../../scripts/Start-EditorServices.ps1');
                var editorServicesLogPath = this.log.getLogFilePath(logFileName);
                var featureFlags = this.sessionSettings.developer.featureFlags !== undefined
                    ? this.sessionSettings.developer.featureFlags.map(f => `'${f}'`).join(', ')
                    : "";
                this.startArgs +=
                    `-LogPath '${editorServicesLogPath}' ` +
                        `-SessionDetailsPath '${this.sessionFilePath}' ` +
                        `-FeatureFlags @(${featureFlags})`;
                var powerShellArgs = [
                    "-NoProfile",
                    "-NonInteractive"
                ];
                // Only add ExecutionPolicy param on Windows
                if (utils.isWindowsOS()) {
                    powerShellArgs.push("-ExecutionPolicy", "Bypass");
                }
                powerShellArgs.push("-Command", "& '" + startScriptPath + "' " + this.startArgs);
                var powerShellExePath = this.exePath;
                if (this.sessionSettings.developer.powerShellExeIsWindowsDevBuild) {
                    // Windows PowerShell development builds need the DEVPATH environment
                    // variable set to the folder where development binaries are held
                    // NOTE: This batch file approach is needed temporarily until VS Code's
                    // createTerminal API gets an argument for setting environment variables
                    // on the launched process.
                    var batScriptPath = path.resolve(__dirname, '../../sessions/powershell.bat');
                    fs.writeFileSync(batScriptPath, `@set DEVPATH=${path.dirname(powerShellExePath)}\r\n@${powerShellExePath} %*`);
                    powerShellExePath = batScriptPath;
                }
                this.log.write("Language server starting --", "    exe: " + powerShellExePath, "    args: " + startScriptPath + ' ' + this.startArgs);
                // Make sure no old session file exists
                utils.deleteSessionFile(this.sessionFilePath);
                // Launch PowerShell in the integrated terminal
                this.consoleTerminal =
                    vscode.window.createTerminal(this.title, powerShellExePath, powerShellArgs);
                if (this.sessionSettings.integratedConsole.showOnStartup) {
                    this.consoleTerminal.show(true);
                }
                // Start the language client
                utils.waitForSessionFile(this.sessionFilePath, (sessionDetails, error) => {
                    // Clean up the session file
                    utils.deleteSessionFile(this.sessionFilePath);
                    if (error) {
                        reject(error);
                    }
                    else {
                        this.sessionDetails = sessionDetails;
                        resolve(this.sessionDetails);
                    }
                });
                // this.powerShellProcess.stderr.on(
                //     'data',
                //     (data) => {
                //         this.log.writeError("ERROR: " + data);
                //         if (this.sessionStatus === SessionStatus.Initializing) {
                //             this.setSessionFailure("PowerShell could not be started, click 'Show Logs' for more details.");
                //         }
                //         else if (this.sessionStatus === SessionStatus.Running) {
                //             this.promptForRestart();
                //         }
                //     });
                this.consoleCloseSubscription =
                    vscode.window.onDidCloseTerminal(terminal => {
                        if (terminal === this.consoleTerminal) {
                            this.log.write("powershell.exe terminated or terminal UI was closed");
                            this.onExitedEmitter.fire();
                        }
                    });
                this.consoleTerminal.processId.then(pid => { this.log.write(`powershell.exe started, pid: ${pid}`); });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    showConsole(preserveFocus) {
        if (this.consoleTerminal) {
            this.consoleTerminal.show(preserveFocus);
        }
    }
    dispose() {
        // Clean up the session file
        utils.deleteSessionFile(this.sessionFilePath);
        if (this.consoleCloseSubscription) {
            this.consoleCloseSubscription.dispose();
            this.consoleCloseSubscription = undefined;
        }
        if (this.consoleTerminal) {
            this.log.write("Terminating PowerShell process...");
            this.consoleTerminal.dispose();
            this.consoleTerminal = undefined;
        }
    }
}
exports.PowerShellProcess = PowerShellProcess;
//# sourceMappingURL=process.js.map