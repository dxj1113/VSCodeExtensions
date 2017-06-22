/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
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
        return `<html><body><h1>Testing content provider, count is ${this.count}.</h1></body></html>`;
    }
}
exports.PowerShellContentProvider = PowerShellContentProvider;
//# sourceMappingURL=ContentProvider.js.map