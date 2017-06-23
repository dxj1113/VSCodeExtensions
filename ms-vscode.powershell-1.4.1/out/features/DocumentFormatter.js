/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
var Window = vscode.window;
const AnimatedStatusBar = require("../controls/animatedStatusBar");
var ScriptRegionRequest;
(function (ScriptRegionRequest) {
    ScriptRegionRequest.type = new vscode_languageclient_1.RequestType("powerShell/getScriptRegion");
})(ScriptRegionRequest = exports.ScriptRegionRequest || (exports.ScriptRegionRequest = {}));
function toRange(scriptRegion) {
    return new vscode.Range(scriptRegion.startLineNumber - 1, scriptRegion.startColumnNumber - 1, scriptRegion.endLineNumber - 1, scriptRegion.endColumnNumber - 1);
}
function toOneBasedPosition(position) {
    return position.translate({ lineDelta: 1, characterDelta: 1 });
}
class DocumentLocker {
    constructor() {
        this.lockedDocuments = new Object();
    }
    isLocked(document) {
        return this.isLockedInternal(this.getKey(document));
    }
    lock(document, unlockWhenDone) {
        this.lockInternal(this.getKey(document), unlockWhenDone);
    }
    unlock(document) {
        this.unlockInternal(this.getKey(document));
    }
    unlockAll() {
        Object.keys(this.lockedDocuments).slice().forEach(documentKey => this.unlockInternal(documentKey));
    }
    getKey(document) {
        return document.uri.toString();
    }
    lockInternal(documentKey, unlockWhenDone) {
        if (!this.isLockedInternal(documentKey)) {
            this.lockedDocuments[documentKey] = true;
        }
        if (unlockWhenDone !== undefined) {
            unlockWhenDone.then(() => this.unlockInternal(documentKey));
        }
    }
    unlockInternal(documentKey) {
        if (this.isLockedInternal(documentKey)) {
            delete this.lockedDocuments[documentKey];
        }
    }
    isLockedInternal(documentKey) {
        return this.lockedDocuments.hasOwnProperty(documentKey);
    }
}
class PSDocumentFormattingEditProvider {
    constructor() {
    }
    get emptyPromise() {
        return Promise.resolve(vscode_1.TextEdit[0]);
    }
    provideDocumentFormattingEdits(document, options, token) {
        return this.provideDocumentRangeFormattingEdits(document, null, options, token);
    }
    provideDocumentRangeFormattingEdits(document, range, options, token) {
        let editor = this.getEditor(document);
        if (editor === undefined) {
            return this.emptyPromise;
        }
        // Check if the document is already being formatted.
        // If so, then ignore the formatting request.
        if (this.isDocumentLocked(document)) {
            return this.emptyPromise;
        }
        // somehow range object gets serialized to an array of Position objects,
        // so we need to use the object literal syntax to initialize it.
        let rangeParam = null;
        if (range != null) {
            rangeParam = {
                start: {
                    line: range.start.line,
                    character: range.start.character
                },
                end: {
                    line: range.end.line,
                    character: range.end.character
                }
            };
        }
        ;
        let requestParams = {
            textDocument: vscode_languageserver_types_1.TextDocumentIdentifier.create(document.uri.toString()),
            range: rangeParam,
            options: this.getEditorSettings()
        };
        let textEdits = this.languageClient.sendRequest(vscode_languageclient_1.DocumentRangeFormattingRequest.type, requestParams);
        this.lockDocument(document, textEdits);
        PSDocumentFormattingEditProvider.showStatusBar(document, textEdits);
        return textEdits;
    }
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        return this.getScriptRegion(document, position, ch).then(scriptRegion => {
            if (scriptRegion === null) {
                return this.emptyPromise;
            }
            return this.provideDocumentRangeFormattingEdits(document, toRange(scriptRegion), options, token);
        });
    }
    setLanguageClient(languageClient) {
        this.languageClient = languageClient;
        // setLanguageClient is called while restarting a session,
        // so this makes sure we clean up the document locker and
        // any residual status bars
        PSDocumentFormattingEditProvider.documentLocker.unlockAll();
        PSDocumentFormattingEditProvider.disposeAllStatusBars();
    }
    getScriptRegion(document, position, ch) {
        let oneBasedPosition = toOneBasedPosition(position);
        return this.languageClient.sendRequest(ScriptRegionRequest.type, {
            fileUri: document.uri.toString(),
            character: ch,
            line: oneBasedPosition.line,
            column: oneBasedPosition.character
        }).then((result) => {
            if (result === null) {
                return null;
            }
            return result.scriptRegion;
        });
    }
    getEditor(document) {
        return Window.visibleTextEditors.find((e, n, obj) => { return e.document === document; });
    }
    isDocumentLocked(document) {
        return PSDocumentFormattingEditProvider.documentLocker.isLocked(document);
    }
    lockDocument(document, unlockWhenDone) {
        PSDocumentFormattingEditProvider.documentLocker.lock(document, unlockWhenDone);
    }
    getEditorSettings() {
        let editorConfiguration = vscode.workspace.getConfiguration("editor");
        return {
            insertSpaces: editorConfiguration.get("insertSpaces"),
            tabSize: editorConfiguration.get("tabSize")
        };
    }
    static showStatusBar(document, hideWhenDone) {
        let statusBar = AnimatedStatusBar.showAnimatedStatusBarMessage("Formatting PowerShell document", hideWhenDone);
        this.statusBarTracker[document.uri.toString()] = statusBar;
        hideWhenDone.then(() => {
            this.disposeStatusBar(document.uri.toString());
        });
    }
    static disposeStatusBar(documentUri) {
        if (this.statusBarTracker.hasOwnProperty(documentUri)) {
            this.statusBarTracker[documentUri].dispose();
            delete this.statusBarTracker[documentUri];
        }
    }
    static disposeAllStatusBars() {
        Object.keys(this.statusBarTracker).slice().forEach((key) => this.disposeStatusBar(key));
    }
}
PSDocumentFormattingEditProvider.documentLocker = new DocumentLocker();
PSDocumentFormattingEditProvider.statusBarTracker = new Object();
class DocumentFormatterFeature {
    constructor() {
        this.firstTriggerCharacter = "}";
        this.moreTriggerCharacters = ["\n"];
        this.documentFormattingEditProvider = new PSDocumentFormattingEditProvider();
        this.formattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider("powershell", this.documentFormattingEditProvider);
        this.rangeFormattingEditProvider = vscode.languages.registerDocumentRangeFormattingEditProvider("powershell", this.documentFormattingEditProvider);
        this.onTypeFormattingEditProvider = vscode.languages.registerOnTypeFormattingEditProvider("powershell", this.documentFormattingEditProvider, this.firstTriggerCharacter, ...this.moreTriggerCharacters);
    }
    setLanguageClient(languageclient) {
        this.languageClient = languageclient;
        this.documentFormattingEditProvider.setLanguageClient(languageclient);
    }
    dispose() {
        this.formattingEditProvider.dispose();
        this.rangeFormattingEditProvider.dispose();
        this.onTypeFormattingEditProvider.dispose();
    }
}
exports.DocumentFormatterFeature = DocumentFormatterFeature;
//# sourceMappingURL=DocumentFormatter.js.map