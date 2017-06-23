/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const utils = require("../utils");
class PesterTestsFeature {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        this.command = vscode.commands.registerCommand('PowerShell.RunPesterTests', (uriString, runInDebugger, describeBlockName) => {
            this.launchTests(uriString, runInDebugger, describeBlockName);
        });
    }
    setLanguageClient(languageClient) {
        this.languageClient = languageClient;
    }
    dispose() {
        this.command.dispose();
    }
    launchTests(uriString, runInDebugger, describeBlockName) {
        var uri = vscode.Uri.parse(uriString);
        let currentDocument = vscode.window.activeTextEditor.document;
        let launchConfig = {
            request: "launch",
            type: "PowerShell",
            script: "Invoke-Pester",
            args: [
                `-Script "${uri.fsPath}"`,
                describeBlockName
                    ? `-TestName "${describeBlockName}"`
                    : ""
            ],
            internalConsoleOptions: "neverOpen",
            noDebug: !runInDebugger,
            cwd: currentDocument.isUntitled
                ? vscode.workspace.rootPath
                : currentDocument.fileName
        };
        // Create or show the interactive console
        // TODO #367: Check if "newSession" mode is configured
        vscode.commands.executeCommand('PowerShell.ShowSessionConsole', true);
        // Write out temporary debug session file
        utils.writeSessionFile(utils.getDebugSessionFilePath(), this.sessionManager.getSessionDetails());
        vscode.commands.executeCommand('vscode.startDebug', launchConfig);
    }
}
exports.PesterTestsFeature = PesterTestsFeature;
//# sourceMappingURL=PesterTests.js.map