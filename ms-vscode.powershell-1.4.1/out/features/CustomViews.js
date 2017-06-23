/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
class CustomViewsFeature {
    constructor() {
        this.commands = [];
        this.contentProvider = new PowerShellContentProvider();
        this.commands.push(vscode.workspace.registerTextDocumentContentProvider("powershell", this.contentProvider));
    }
    setLanguageClient(languageClient) {
        languageClient.onRequest(NewCustomViewRequest.type, args => {
            this.contentProvider.createView(args.id, args.title, args.viewType);
        });
        languageClient.onRequest(ShowCustomViewRequest.type, args => {
            this.contentProvider.showView(args.id, args.viewColumn);
        });
        languageClient.onRequest(CloseCustomViewRequest.type, args => {
            this.contentProvider.closeView(args.id);
        });
        languageClient.onRequest(SetHtmlContentViewRequest.type, args => {
            this.contentProvider.setHtmlContentView(args.id, args.htmlBodyContent);
        });
        languageClient.onRequest(AppendHtmlOutputViewRequest.type, args => {
            this.contentProvider.appendHtmlOutputView(args.id, args.appendedHtmlBodyContent);
        });
        this.languageClient = languageClient;
    }
    dispose() {
        this.commands.forEach(d => d.dispose());
    }
}
exports.CustomViewsFeature = CustomViewsFeature;
class PowerShellContentProvider {
    constructor() {
        this.count = 1;
        this.viewIndex = {};
        this.didChangeEvent = new vscode.EventEmitter();
        this.onDidChange = this.didChangeEvent.event;
    }
    provideTextDocumentContent(uri) {
        return this.viewIndex[uri.toString()].getContent();
    }
    createView(id, title, viewType) {
        let view = undefined;
        switch (viewType) {
            case CustomViewType.HtmlContent:
                view = new HtmlContentView(id, title);
        }
        ;
        this.viewIndex[this.getUri(view.id)] = view;
    }
    showView(id, viewColumn) {
        let uriString = this.getUri(id);
        let view = this.viewIndex[uriString];
        vscode.commands.executeCommand("vscode.previewHtml", uriString, viewColumn, view.title);
    }
    closeView(id) {
        let uriString = this.getUri(id);
        let view = this.viewIndex[uriString];
        vscode.workspace.textDocuments.some(doc => {
            if (doc.uri.toString() === uriString) {
                vscode.window
                    .showTextDocument(doc)
                    .then(editor => vscode.commands.executeCommand("workbench.action.closeActiveEditor"));
                return true;
            }
            return false;
        });
    }
    setHtmlContentView(id, content) {
        let uriString = this.getUri(id);
        let view = this.viewIndex[uriString];
        if (view.viewType === CustomViewType.HtmlContent) {
            view.setContent(content);
            this.didChangeEvent.fire(vscode.Uri.parse(uriString));
        }
    }
    appendHtmlOutputView(id, content) {
        let uriString = this.getUri(id);
        let view = this.viewIndex[uriString];
        if (view.viewType === CustomViewType.HtmlContent) {
            view.appendContent(content);
            this.didChangeEvent.fire(vscode.Uri.parse(uriString));
        }
    }
    getUri(id) {
        return `powershell://views/${id}`;
    }
}
class CustomView {
    constructor(id, title, viewType) {
        this.id = id;
        this.title = title;
        this.viewType = viewType;
    }
}
class HtmlContentView extends CustomView {
    constructor(id, title) {
        super(id, title, CustomViewType.HtmlContent);
        this.htmlContent = "";
    }
    setContent(htmlContent) {
        this.htmlContent = htmlContent;
    }
    appendContent(content) {
        this.htmlContent += content;
    }
    getContent() {
        // Return an HTML page which disables JavaScript in content by default
        return `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src *; style-src 'self'; script-src 'none';"></head><body>${this.htmlContent}</body></html>`;
    }
}
var CustomViewType;
(function (CustomViewType) {
    CustomViewType[CustomViewType["HtmlContent"] = 1] = "HtmlContent";
})(CustomViewType || (CustomViewType = {}));
var NewCustomViewRequest;
(function (NewCustomViewRequest) {
    NewCustomViewRequest.type = new vscode_languageclient_1.RequestType('powerShell/newCustomView');
})(NewCustomViewRequest || (NewCustomViewRequest = {}));
var ShowCustomViewRequest;
(function (ShowCustomViewRequest) {
    ShowCustomViewRequest.type = new vscode_languageclient_1.RequestType('powerShell/showCustomView');
})(ShowCustomViewRequest || (ShowCustomViewRequest = {}));
var CloseCustomViewRequest;
(function (CloseCustomViewRequest) {
    CloseCustomViewRequest.type = new vscode_languageclient_1.RequestType('powerShell/closeCustomView');
})(CloseCustomViewRequest || (CloseCustomViewRequest = {}));
var SetHtmlContentViewRequest;
(function (SetHtmlContentViewRequest) {
    SetHtmlContentViewRequest.type = new vscode_languageclient_1.RequestType('powerShell/setHtmlViewContent');
})(SetHtmlContentViewRequest || (SetHtmlContentViewRequest = {}));
var AppendHtmlOutputViewRequest;
(function (AppendHtmlOutputViewRequest) {
    AppendHtmlOutputViewRequest.type = new vscode_languageclient_1.RequestType('powerShell/appendHtmlViewContent');
})(AppendHtmlOutputViewRequest || (AppendHtmlOutputViewRequest = {}));
//# sourceMappingURL=CustomViews.js.map