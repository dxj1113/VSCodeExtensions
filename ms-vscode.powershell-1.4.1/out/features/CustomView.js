/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
class CustomViewFeature {
    constructor() {
        this.disposables = [];
        this.disposables.push(vscode.workspace.registerTextDocumentContentProvider("powershell", new PowerShellContentProvider()));
        // vscode.commands.executeCommand(
        //     "vscode.previewHtml",
        //     "powershell://home",
        //     vscode.ViewColumn.Two,
        //     "My Preview");
    }
    setLanguageClient(languageclient) {
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.CustomViewFeature = CustomViewFeature;
class PowerShellContentProvider {
    constructor() {
        this.count = 1;
        // NEED:
        // - Event from server to indicate content update
        // - Request to server to get content for uri
        // - Request to client to register content provider for uri prefix (later?)
        // - Request from server to client to show document preview for arbitrary URI
        // APIs:
        // - $psEditor.Window.ShowDocumentPreview(uri, column)
        /*
    
        $psEditor top-level objects:
    
        Workspace
        Window
        Components
    
        */
        // USAGE PATTERNS:
        // - PowerShell script pushing content updates to drive preview changes
        // - Something in VS Code navigating to the document URI, a command maybe?
        // We need both push and pull.
    }
    provideTextDocumentContent(uri) {
        return `<html><head><script language="javascript" type="text/javascript">console.log("Hello!");</script></head><body><h1>Testing content provider, count is ${this.count}.</h1>Do that stuff!</body></html>`;
    }
}
//# sourceMappingURL=CustomView.js.map