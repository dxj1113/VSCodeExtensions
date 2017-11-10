"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
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
            this.contentProvider.setHtmlContentView(args.id, args.htmlContent);
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
        this.htmlContent = {
            bodyContent: "",
            javaScriptPaths: [],
            styleSheetPaths: []
        };
    }
    setContent(htmlContent) {
        this.htmlContent = htmlContent;
    }
    appendContent(content) {
        this.htmlContent.bodyContent += content;
    }
    getContent() {
        var styleSrc = "none";
        var styleTags = "";
        function getNonce() {
            return Math.floor(Math.random() * 100000) + 100000;
        }
        if (this.htmlContent.styleSheetPaths &&
            this.htmlContent.styleSheetPaths.length > 0) {
            styleSrc = "";
            this.htmlContent.styleSheetPaths.forEach(p => {
                var nonce = getNonce();
                styleSrc += `'nonce-${nonce}' `;
                styleTags += `<link nonce="${nonce}" href="${p}" rel="stylesheet" type="text/css" />\n`;
            });
        }
        var scriptSrc = "none";
        var scriptTags = "";
        if (this.htmlContent.javaScriptPaths &&
            this.htmlContent.javaScriptPaths.length > 0) {
            scriptSrc = "";
            this.htmlContent.javaScriptPaths.forEach(p => {
                var nonce = getNonce();
                scriptSrc += `'nonce-${nonce}' `;
                scriptTags += `<script nonce="${nonce}" src="${p}"></script>\n`;
            });
        }
        // Return an HTML page with the specified content
        return `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src *; style-src ${styleSrc}; script-src ${scriptSrc};">${styleTags}</head><body>\n${this.htmlContent.bodyContent}\n${scriptTags}</body></html>`;
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