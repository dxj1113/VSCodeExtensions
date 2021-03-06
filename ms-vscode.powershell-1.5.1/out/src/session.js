"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const fs = require("fs");
const net = require("net");
const path = require("path");
const utils = require("./utils");
const vscode = require("vscode");
const cp = require("child_process");
const Settings = require("./settings");
const process_1 = require("./process");
const vscode_languageclient_1 = require("vscode-languageclient");
const platform_1 = require("./platform");
var SessionStatus;
(function (SessionStatus) {
    SessionStatus[SessionStatus["NotStarted"] = 0] = "NotStarted";
    SessionStatus[SessionStatus["Initializing"] = 1] = "Initializing";
    SessionStatus[SessionStatus["Running"] = 2] = "Running";
    SessionStatus[SessionStatus["Stopping"] = 3] = "Stopping";
    SessionStatus[SessionStatus["Failed"] = 4] = "Failed";
})(SessionStatus = exports.SessionStatus || (exports.SessionStatus = {}));
class SessionManager {
    constructor(requiredEditorServicesVersion, log) {
        this.requiredEditorServicesVersion = requiredEditorServicesVersion;
        this.log = log;
        this.ShowSessionMenuCommandName = "PowerShell.ShowSessionMenu";
        this.powerShellExePath = "";
        this.extensionFeatures = [];
        this.registeredCommands = [];
        this.languageServerClient = undefined;
        this.sessionSettings = undefined;
        // When in development mode, VS Code's session ID is a fake
        // value of "someValue.machineId".  Use that to detect dev
        // mode for now until Microsoft/vscode#10272 gets implemented.
        this.inDevelopmentMode = vscode.env.sessionId === "someValue.sessionId";
        this.platformDetails = platform_1.getPlatformDetails();
        // Get the current version of this extension
        this.hostVersion =
            vscode
                .extensions
                .getExtension("ms-vscode.PowerShell")
                .packageJSON
                .version;
        let osBitness = this.platformDetails.isOS64Bit ? "64-bit" : "32-bit";
        let procBitness = this.platformDetails.isProcess64Bit ? "64-bit" : "32-bit";
        this.log.write(`Visual Studio Code v${vscode.version} ${procBitness}`, `PowerShell Extension v${this.hostVersion}`, `Operating System: ${platform_1.OperatingSystem[this.platformDetails.operatingSystem]} ${osBitness}`);
        // Fix the host version so that PowerShell can consume it.
        // This is needed when the extension uses a prerelease
        // version string like 0.9.1-insiders-1234.
        this.hostVersion = this.hostVersion.split('-')[0];
        this.registerCommands();
    }
    setExtensionFeatures(extensionFeatures) {
        this.extensionFeatures = extensionFeatures;
    }
    start() {
        this.sessionSettings = Settings.load();
        this.log.startNewLog(this.sessionSettings.developer.editorServicesLogLevel);
        this.focusConsoleOnExecute = this.sessionSettings.integratedConsole.focusConsoleOnExecute;
        this.createStatusBarItem();
        this.powerShellExePath = this.getPowerShellExePath();
        // Check for OpenSSL dependency on macOS when running PowerShell Core alpha. Look for the default
        // Homebrew installation path and if that fails check the system-wide library path.
        if (os.platform() == "darwin" && this.getPowerShellVersionLabel() == "alpha") {
            if (!(utils.checkIfFileExists("/usr/local/opt/openssl/lib/libcrypto.1.0.0.dylib") &&
                utils.checkIfFileExists("/usr/local/opt/openssl/lib/libssl.1.0.0.dylib")) &&
                !(utils.checkIfFileExists("/usr/local/lib/libcrypto.1.0.0.dylib") &&
                    utils.checkIfFileExists("/usr/local/lib/libssl.1.0.0.dylib"))) {
                var thenable = vscode.window.showWarningMessage("The PowerShell extension will not work without OpenSSL on macOS and OS X when using PowerShell alpha", "Show Documentation");
                thenable.then((s) => {
                    if (s === "Show Documentation") {
                        cp.exec("open https://github.com/PowerShell/vscode-powershell/blob/master/docs/troubleshooting.md#1-powershell-intellisense-does-not-work-cant-debug-scripts");
                    }
                });
                // Don't continue initializing since Editor Services will not load successfully
                this.setSessionFailure("Cannot start PowerShell Editor Services due to missing OpenSSL dependency.");
                return;
            }
        }
        this.suppressRestartPrompt = false;
        if (this.powerShellExePath) {
            var bundledModulesPath = path.resolve(__dirname, "../../modules");
            if (this.inDevelopmentMode) {
                var devBundledModulesPath = 
                // this.sessionSettings.developer.bundledModulesPath ||
                path.resolve(__dirname, this.sessionSettings.developer.bundledModulesPath ||
                    "../../../PowerShellEditorServices/module");
                // Make sure the module's bin path exists
                if (fs.existsSync(path.join(devBundledModulesPath, "PowerShellEditorServices/bin"))) {
                    bundledModulesPath = devBundledModulesPath;
                }
                else {
                    this.log.write(`\nWARNING: In development mode but PowerShellEditorServices dev module path cannot be found (or has not been built yet): ${devBundledModulesPath}\n`);
                }
            }
            this.editorServicesArgs =
                "-EditorServicesVersion '" + this.requiredEditorServicesVersion + "' " +
                    "-HostName 'Visual Studio Code Host' " +
                    "-HostProfileId 'Microsoft.VSCode' " +
                    "-HostVersion '" + this.hostVersion + "' " +
                    "-AdditionalModules @('PowerShellEditorServices.VSCode') " +
                    "-BundledModulesPath '" + bundledModulesPath + "' " +
                    "-EnableConsoleRepl ";
            if (this.sessionSettings.developer.editorServicesWaitForDebugger) {
                this.editorServicesArgs += '-WaitForDebugger ';
            }
            if (this.sessionSettings.developer.editorServicesLogLevel) {
                this.editorServicesArgs += "-LogLevel '" + this.sessionSettings.developer.editorServicesLogLevel + "' ";
            }
            this.startPowerShell(this.powerShellExePath, this.sessionSettings.developer.powerShellExeIsWindowsDevBuild, bundledModulesPath, this.editorServicesArgs);
        }
        else {
            this.setSessionFailure("PowerShell could not be started, click 'Show Logs' for more details.");
        }
    }
    stop() {
        // Shut down existing session if there is one
        this.log.write("Shutting down language client...");
        if (this.sessionStatus === SessionStatus.Failed) {
            // Before moving further, clear out the client and process if
            // the process is already dead (i.e. it crashed)
            this.languageServerClient = undefined;
            this.languageServerProcess = undefined;
        }
        this.sessionStatus = SessionStatus.Stopping;
        // Close the language server client
        if (this.languageServerClient !== undefined) {
            this.languageServerClient.stop();
            this.languageServerClient = undefined;
        }
        // Kill the PowerShell proceses we spawned
        if (this.debugSessionProcess) {
            this.debugSessionProcess.dispose();
        }
        if (this.languageServerProcess) {
            this.languageServerProcess.dispose();
        }
        this.sessionStatus = SessionStatus.NotStarted;
    }
    getSessionDetails() {
        return this.sessionDetails;
    }
    getPowerShellVersionDetails() {
        return this.versionDetails;
    }
    dispose() {
        // Stop the current session
        this.stop();
        // Dispose of all commands
        this.registeredCommands.forEach(command => { command.dispose(); });
    }
    createDebugSessionProcess(sessionPath, sessionSettings) {
        this.debugSessionProcess =
            new process_1.PowerShellProcess(this.powerShellExePath, "[DBG] PowerShell Integrated Console", this.log, this.editorServicesArgs + "-DebugServiceOnly ", sessionPath, sessionSettings);
        return this.debugSessionProcess;
    }
    onConfigurationUpdated() {
        var settings = Settings.load();
        this.focusConsoleOnExecute = settings.integratedConsole.focusConsoleOnExecute;
        // Detect any setting changes that would affect the session
        if (!this.suppressRestartPrompt &&
            (settings.useX86Host !== this.sessionSettings.useX86Host ||
                settings.powerShellExePath.toLowerCase() !== this.sessionSettings.powerShellExePath.toLowerCase() ||
                settings.developer.powerShellExePath.toLowerCase() !== this.sessionSettings.developer.powerShellExePath.toLowerCase() ||
                settings.developer.editorServicesLogLevel.toLowerCase() !== this.sessionSettings.developer.editorServicesLogLevel.toLowerCase() ||
                settings.developer.bundledModulesPath.toLowerCase() !== this.sessionSettings.developer.bundledModulesPath.toLowerCase())) {
            vscode.window.showInformationMessage("The PowerShell runtime configuration has changed, would you like to start a new session?", "Yes", "No")
                .then((response) => {
                if (response === "Yes") {
                    this.restartSession();
                }
            });
        }
    }
    setStatusBarVersionString(runspaceDetails) {
        var versionString = this.versionDetails.architecture === "x86"
            ? `${runspaceDetails.powerShellVersion.displayVersion} (${runspaceDetails.powerShellVersion.architecture})`
            : runspaceDetails.powerShellVersion.displayVersion;
        if (runspaceDetails.runspaceType != RunspaceType.Local) {
            versionString += ` [${runspaceDetails.connectionString}]`;
        }
        this.setSessionStatus(versionString, SessionStatus.Running);
    }
    registerCommands() {
        this.registeredCommands = [
            vscode.commands.registerCommand('PowerShell.RestartSession', () => { this.restartSession(); }),
            vscode.commands.registerCommand(this.ShowSessionMenuCommandName, () => { this.showSessionMenu(); }),
            vscode.workspace.onDidChangeConfiguration(() => this.onConfigurationUpdated()),
            vscode.commands.registerCommand('PowerShell.ShowSessionConsole', (isExecute) => { this.showSessionConsole(isExecute); })
        ];
    }
    startPowerShell(powerShellExePath, isWindowsDevBuild, bundledModulesPath, startArgs) {
        this.setSessionStatus("Starting PowerShell...", SessionStatus.Initializing);
        var sessionFilePath = utils.getSessionFilePath(Math.floor(100000 + Math.random() * 900000));
        this.languageServerProcess =
            new process_1.PowerShellProcess(this.powerShellExePath, "PowerShell Integrated Console", this.log, startArgs, sessionFilePath, this.sessionSettings);
        this.languageServerProcess.onExited(() => {
            if (this.sessionStatus === SessionStatus.Running) {
                this.setSessionStatus("Session exited", SessionStatus.Failed);
                this.promptForRestart();
            }
        });
        this.languageServerProcess
            .start("EditorServices")
            .then(sessionDetails => {
            this.sessionDetails = sessionDetails;
            if (sessionDetails.status === "started") {
                this.log.write("Language server started.");
                // Start the language service client
                this.startLanguageClient(sessionDetails);
            }
            else if (sessionDetails.status === "failed") {
                if (sessionDetails.reason === "unsupported") {
                    this.setSessionFailure(`PowerShell language features are only supported on PowerShell version 3 and above.  The current version is ${sessionDetails.powerShellVersion}.`);
                }
                else if (sessionDetails.reason === "languageMode") {
                    this.setSessionFailure(`PowerShell language features are disabled due to an unsupported LanguageMode: ${sessionDetails.detail}`);
                }
                else {
                    this.setSessionFailure(`PowerShell could not be started for an unknown reason '${sessionDetails.reason}'`);
                }
            }
            else {
                // TODO: Handle other response cases
            }
        }, error => {
            this.log.write("Language server startup failed.");
            this.setSessionFailure("The language service could not be started: ", error);
        });
    }
    promptForRestart() {
        vscode.window.showErrorMessage("The PowerShell session has terminated due to an error, would you like to restart it?", "Yes", "No")
            .then((answer) => { if (answer === "Yes") {
            this.restartSession();
        } });
    }
    startLanguageClient(sessionDetails) {
        var port = sessionDetails.languageServicePort;
        // Log the session details object
        this.log.write(JSON.stringify(sessionDetails));
        try {
            this.log.write("Connecting to language service on port " + port + "...");
            let connectFunc = () => {
                return new Promise((resolve, reject) => {
                    var socket = net.connect(port);
                    socket.on('connect', () => {
                        this.log.write("Language service connected.");
                        resolve({ writer: socket, reader: socket });
                    });
                });
            };
            let clientOptions = {
                documentSelector: [utils.PowerShellLanguageId],
                synchronize: {
                    configurationSection: utils.PowerShellLanguageId,
                },
                errorHandler: {
                    // Override the default error handler to prevent it from
                    // closing the LanguageClient incorrectly when the socket
                    // hangs up (ECONNRESET errors).
                    error: (error, message, count) => {
                        // TODO: Is there any error worth terminating on?
                        return vscode_languageclient_1.ErrorAction.Continue;
                    },
                    closed: () => {
                        // We have our own restart experience
                        return vscode_languageclient_1.CloseAction.DoNotRestart;
                    }
                },
                revealOutputChannelOn: vscode_languageclient_1.RevealOutputChannelOn.Never,
                middleware: this
            };
            this.languageServerClient =
                new vscode_languageclient_1.LanguageClient('PowerShell Editor Services', connectFunc, clientOptions);
            this.languageServerClient.onReady().then(() => {
                this.languageServerClient
                    .sendRequest(PowerShellVersionRequest.type)
                    .then((versionDetails) => {
                    this.versionDetails = versionDetails;
                    this.setSessionStatus(this.versionDetails.architecture === "x86"
                        ? `${this.versionDetails.displayVersion} (${this.versionDetails.architecture})`
                        : this.versionDetails.displayVersion, SessionStatus.Running);
                });
                // Send the new LanguageClient to extension features
                // so that they can register their message handlers
                // before the connection is established.
                this.updateExtensionFeatures(this.languageServerClient);
                this.languageServerClient.onNotification(RunspaceChangedEvent.type, (runspaceDetails) => { this.setStatusBarVersionString(runspaceDetails); });
            }, (reason) => {
                this.setSessionFailure("Could not start language service: ", reason);
            });
            this.languageServerClient.start();
        }
        catch (e) {
            this.setSessionFailure("The language service could not be started: ", e);
        }
    }
    updateExtensionFeatures(languageClient) {
        this.extensionFeatures.forEach(feature => {
            feature.setLanguageClient(languageClient);
        });
    }
    restartSession() {
        this.stop();
        this.start();
    }
    createStatusBarItem() {
        if (this.statusBarItem === undefined) {
            // Create the status bar item and place it right next
            // to the language indicator
            this.statusBarItem =
                vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
            this.statusBarItem.command = this.ShowSessionMenuCommandName;
            this.statusBarItem.tooltip = "Show PowerShell Session Menu";
            this.statusBarItem.show();
            vscode.window.onDidChangeActiveTextEditor(textEditor => {
                if (textEditor === undefined
                    || textEditor.document.languageId !== "powershell") {
                    this.statusBarItem.hide();
                }
                else {
                    this.statusBarItem.show();
                }
            });
        }
    }
    setSessionStatus(statusText, status) {
        // Set color and icon for 'Running' by default
        var statusIconText = "$(terminal) ";
        var statusColor = "#affc74";
        if (status == SessionStatus.Initializing) {
            statusIconText = "$(sync) ";
            statusColor = "#f3fc74";
        }
        else if (status == SessionStatus.Failed) {
            statusIconText = "$(alert) ";
            statusColor = "#fcc174";
        }
        this.sessionStatus = status;
        this.statusBarItem.color = statusColor;
        this.statusBarItem.text = statusIconText + statusText;
    }
    setSessionFailure(message, ...additionalMessages) {
        this.log.writeAndShowError(message, ...additionalMessages);
        this.setSessionStatus("Initialization Error", SessionStatus.Failed);
    }
    getPowerShellExePath() {
        if (!this.sessionSettings.powerShellExePath &&
            this.sessionSettings.developer.powerShellExePath) {
            // Show deprecation message with fix action.
            // We don't need to wait on this to complete
            // because we can finish gathering the configured
            // PowerShell path without the fix
            vscode
                .window
                .showWarningMessage("The 'powershell.developer.powerShellExePath' setting is deprecated, use 'powershell.powerShellExePath' instead.", "Fix Automatically")
                .then(choice => {
                if (choice) {
                    this.suppressRestartPrompt = true;
                    Settings
                        .change("powerShellExePath", this.sessionSettings.developer.powerShellExePath, true)
                        .then(() => {
                        return Settings.change("developer.powerShellExePath", undefined, true);
                    })
                        .then(() => {
                        this.suppressRestartPrompt = false;
                    });
                }
            });
        }
        // Is there a setting override for the PowerShell path?
        var powerShellExePath = (this.sessionSettings.powerShellExePath ||
            this.sessionSettings.developer.powerShellExePath ||
            "").trim();
        // New versions of PS Core uninstall the previous version
        // so make sure the path stored in the settings exists.
        if (!fs.existsSync(powerShellExePath)) {
            this.log.write(`Path specified by 'powerShellExePath' setting - '${powerShellExePath}' - not found, reverting to default PowerShell path.`);
            powerShellExePath = "";
        }
        if (this.platformDetails.operatingSystem === platform_1.OperatingSystem.Windows &&
            powerShellExePath.length > 0) {
            // Check the path bitness
            let fixedPath = platform_1.fixWindowsPowerShellPath(powerShellExePath, this.platformDetails);
            if (fixedPath !== powerShellExePath) {
                let bitness = this.platformDetails.isOS64Bit ? 64 : 32;
                // Show deprecation message with fix action.
                // We don't need to wait on this to complete
                // because we can finish gathering the configured
                // PowerShell path without the fix
                vscode
                    .window
                    .showWarningMessage(`The specified PowerShell path is incorrect for ${bitness}-bit VS Code, using '${fixedPath}' instead.`, "Fix Setting Automatically")
                    .then(choice => {
                    if (choice) {
                        this.suppressRestartPrompt = true;
                        Settings
                            .change("powerShellExePath", this.sessionSettings.developer.powerShellExePath, true)
                            .then(() => {
                            return Settings.change("developer.powerShellExePath", undefined, true);
                        })
                            .then(() => {
                            this.suppressRestartPrompt = false;
                        });
                    }
                });
                powerShellExePath = fixedPath;
            }
        }
        return powerShellExePath.length > 0
            ? this.resolvePowerShellPath(powerShellExePath)
            : platform_1.getDefaultPowerShellPath(this.platformDetails, this.sessionSettings.useX86Host);
    }
    changePowerShellExePath(exePath) {
        this.suppressRestartPrompt = true;
        Settings
            .change("powerShellExePath", exePath, true)
            .then(() => this.restartSession());
    }
    resolvePowerShellPath(powerShellExePath) {
        var resolvedPath = path.resolve(__dirname, powerShellExePath);
        // If the path does not exist, show an error
        if (!utils.checkIfFileExists(resolvedPath)) {
            this.setSessionFailure("powershell.exe cannot be found or is not accessible at path " + resolvedPath);
            return null;
        }
        return resolvedPath;
    }
    getPowerShellVersionLabel() {
        if (this.powerShellExePath) {
            var powerShellCommandLine = [
                this.powerShellExePath,
                "-NoProfile",
                "-NonInteractive"
            ];
            // Only add ExecutionPolicy param on Windows
            if (utils.isWindowsOS()) {
                powerShellCommandLine.push("-ExecutionPolicy", "Bypass");
            }
            powerShellCommandLine.push("-Command", "'$PSVersionTable | ConvertTo-Json'");
            var powerShellOutput = cp.execSync(powerShellCommandLine.join(' '));
            var versionDetails = JSON.parse(powerShellOutput.toString());
            return versionDetails.PSVersion.Label;
        }
        else {
            // TODO: throw instead?
            return null;
        }
    }
    showSessionConsole(isExecute) {
        if (this.languageServerProcess) {
            this.languageServerProcess.showConsole(isExecute && !this.focusConsoleOnExecute);
        }
    }
    showSessionMenu() {
        var menuItems = [];
        if (this.sessionStatus === SessionStatus.Running) {
            menuItems = [
                new SessionMenuItem(`Current session: PowerShell ${this.versionDetails.displayVersion} (${this.versionDetails.architecture}) ${this.versionDetails.edition} Edition [${this.versionDetails.version}]`, () => { vscode.commands.executeCommand("PowerShell.ShowLogs"); }),
                new SessionMenuItem("Restart Current Session", () => { this.restartSession(); }),
            ];
        }
        else if (this.sessionStatus === SessionStatus.Failed) {
            menuItems = [
                new SessionMenuItem(`Session initialization failed, click here to show PowerShell extension logs`, () => { vscode.commands.executeCommand("PowerShell.ShowLogs"); }),
            ];
        }
        var currentExePath = (this.powerShellExePath || "").toLowerCase();
        var powerShellItems = platform_1.getAvailablePowerShellExes(this.platformDetails)
            .filter(item => item.exePath.toLowerCase() !== currentExePath)
            .map(item => {
            return new SessionMenuItem(`Switch to ${item.versionName}`, () => { this.changePowerShellExePath(item.exePath); });
        });
        menuItems = menuItems.concat(powerShellItems);
        menuItems.push(new SessionMenuItem("Open Session Logs Folder", () => { vscode.commands.executeCommand("PowerShell.OpenLogFolder"); }));
        vscode
            .window
            .showQuickPick(menuItems)
            .then((selectedItem) => { selectedItem.callback(); });
    }
    // ----- LanguageClient middleware methods -----
    resolveCodeLens(codeLens, token, next) {
        var resolvedCodeLens = next(codeLens, token);
        let resolveFunc = (codeLens) => {
            if (codeLens.command.command === "editor.action.showReferences") {
                var oldArgs = codeLens.command.arguments;
                // Our JSON objects don't get handled correctly by
                // VS Code's built in editor.action.showReferences
                // command so we need to convert them into the
                // appropriate types to send them as command
                // arguments.
                codeLens.command.arguments = [
                    vscode.Uri.parse(oldArgs[0]),
                    new vscode.Position(oldArgs[1].line, oldArgs[1].character),
                    oldArgs[2].map(position => {
                        return new vscode.Location(vscode.Uri.parse(position.uri), new vscode.Range(position.range.start.line, position.range.start.character, position.range.end.line, position.range.end.character));
                    })
                ];
            }
            return codeLens;
        };
        if (resolvedCodeLens.then) {
            return resolvedCodeLens.then(resolveFunc);
        }
        else if (resolvedCodeLens) {
            return resolveFunc(resolvedCodeLens);
        }
        return resolvedCodeLens;
    }
}
exports.SessionManager = SessionManager;
class SessionMenuItem {
    constructor(label, callback = () => { }) {
        this.label = label;
        this.callback = callback;
    }
}
var PowerShellVersionRequest;
(function (PowerShellVersionRequest) {
    PowerShellVersionRequest.type = new vscode_languageclient_1.RequestType0('powerShell/getVersion');
})(PowerShellVersionRequest = exports.PowerShellVersionRequest || (exports.PowerShellVersionRequest = {}));
var RunspaceType;
(function (RunspaceType) {
    RunspaceType[RunspaceType["Local"] = 0] = "Local";
    RunspaceType[RunspaceType["Process"] = 1] = "Process";
    RunspaceType[RunspaceType["Remote"] = 2] = "Remote";
})(RunspaceType = exports.RunspaceType || (exports.RunspaceType = {}));
var RunspaceChangedEvent;
(function (RunspaceChangedEvent) {
    RunspaceChangedEvent.type = new vscode_languageclient_1.NotificationType('powerShell/runspaceChanged');
})(RunspaceChangedEvent = exports.RunspaceChangedEvent || (exports.RunspaceChangedEvent = {}));
//# sourceMappingURL=session.js.map