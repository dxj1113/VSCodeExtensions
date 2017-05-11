"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// cSpell:words rxjs cspell diags
const vscode = require("vscode");
const path = require("path");
const Rx = require("rxjs/Rx");
const preview = require("./pugCSpellInfo");
const commands = require("./commands");
const util = require("./util");
const uriHelper_1 = require("./uriHelper");
const schemeCSpellInfo = 'cspell-info';
exports.commandDisplayCSpellInfo = 'cSpell.displayCSpellInfo';
exports.commandEnableLanguage = 'cSpell.enableLanguageFromCSpellInfo';
exports.commandDisableLanguage = 'cSpell.disableLanguageFromCSpellInfo';
exports.commandTest = 'cSpell.test';
function generateEnableDisableLanguageLink(enable, languageId, uri) {
    const links = [
        `command:${exports.commandDisableLanguage}?`,
        `command:${exports.commandEnableLanguage}?`,
    ];
    return encodeURI(links[enable ? 1 : 0] + JSON.stringify([languageId, uri.toString()]));
}
function activate(context, client) {
    const previewUri = vscode.Uri.parse(`${schemeCSpellInfo}://authority/cspell-info-preview`);
    const onRefresh = new Rx.Subject();
    let lastDocumentUri = undefined;
    const imagesUri = vscode.Uri.file(context.asAbsolutePath('images'));
    const imagesPath = imagesUri.path;
    class CSpellInfoTextDocumentContentProvider {
        constructor() {
            this._onDidChange = new vscode.EventEmitter();
        }
        provideTextDocumentContent(_) {
            // console.log(_);
            const editor = vscode.window.activeTextEditor;
            const doc = lastDocumentUri && findMatchingDocument(lastDocumentUri.toString())
                || (editor && editor.document);
            return this.createInfoHtml(doc);
        }
        get onDidChange() {
            return this._onDidChange.event;
        }
        update(uri) {
            this._onDidChange.fire(uri);
        }
        createInfoHtml(document) {
            if (!document) {
                return Promise.resolve('<body>Select an editor tab.</body>');
            }
            const uri = document.uri;
            const filename = path.basename(uri.path);
            const diagnostics = client.diagnostics;
            const diags = diagnostics && diagnostics.get(uri);
            const allSpellingErrors = (diags || [])
                .map(d => d.range)
                .map(range => document.getText(range));
            const spellingErrors = diags && util.freqCount(allSpellingErrors);
            autoRefresh(uri); // Since the diags can change, we need to setup a refresh.
            return client.isSpellCheckEnabled(document).then(response => {
                const { fileEnabled = false, languageEnabled = false } = response;
                const languageId = document.languageId;
                const html = preview.render({
                    fileEnabled,
                    languageEnabled,
                    languageId,
                    filename,
                    spellingErrors,
                    linkEnableDisableLanguage: generateEnableDisableLanguageLink(!languageEnabled, languageId, document.uri),
                    imagesPath,
                });
                return html;
            });
        }
    }
    const provider = new CSpellInfoTextDocumentContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider(schemeCSpellInfo, provider);
    const subOnDidChangeTextDocument = onRefresh
        .filter(uri => uriHelper_1.isSupportedUri(uri))
        .do(uri => lastDocumentUri = uri)
        .debounceTime(250)
        .subscribe(() => provider.update(previewUri));
    const subOnDidChangeDoc = vscode.workspace.onDidChangeTextDocument((e) => {
        if (vscode.window.activeTextEditor && e.document && e.document === vscode.window.activeTextEditor.document) {
            onRefresh.next(e.document.uri);
        }
    });
    const subOnDidChangeEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor === vscode.window.activeTextEditor && editor.document) {
            onRefresh.next(editor.document.uri);
        }
    });
    function displayCSpellInfo() {
        return vscode.commands
            .executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'Spell Checker Info')
            .then((success) => { }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    }
    function findVisibleTextEditors(uri) {
        const editors = vscode.window.visibleTextEditors
            .filter(e => !!e.document)
            .filter(e => e.document.uri.toString() === uri);
        return editors;
    }
    function findDocumentInVisibleTextEditors(uri) {
        const docs = vscode.window.visibleTextEditors
            .map(e => e.document)
            .filter(doc => !!doc)
            .filter(doc => doc.uri.toString() === uri);
        return docs[0];
    }
    function findMatchingDocument(uri) {
        const workspace = vscode.workspace || {};
        const docs = (workspace.textDocuments || [])
            .filter(doc => doc.uri.toString() === uri);
        return docs[0] || findDocumentInVisibleTextEditors(uri);
    }
    function changeFocus(uri) {
        const promises = findVisibleTextEditors(uri)
            .map(editor => vscode.window.showTextDocument(editor.document, editor.viewColumn, false));
        return Promise.all(promises);
    }
    function triggerSettingsRefresh(uri) {
        client.triggerSettingsRefresh();
    }
    function enableLanguage(languageId, uri) {
        commands.enableLanguageId(languageId)
            .then(() => triggerRefresh(uri));
    }
    function disableLanguage(languageId, uri) {
        commands.disableLanguageId(languageId)
            .then(() => triggerRefresh(uri));
    }
    function triggerRefresh(uri) {
        if (uri) {
            triggerSettingsRefresh(vscode.Uri.parse(uri));
            changeFocus(uri);
        }
    }
    function makeDisposable(sub) {
        return {
            dispose: () => sub.unsubscribe()
        };
    }
    function testCommand(...args) {
        const stopHere = args;
    }
    function autoRefresh(uri) {
        lastDocumentUri = uri;
        setTimeout(() => {
            if (uri === lastDocumentUri) {
                onRefresh.next(uri);
            }
        }, 1000);
    }
    context.subscriptions.push(subOnDidChangeEditor, subOnDidChangeDoc, vscode.commands.registerCommand(exports.commandDisplayCSpellInfo, displayCSpellInfo), vscode.commands.registerCommand(exports.commandEnableLanguage, enableLanguage), vscode.commands.registerCommand(exports.commandDisableLanguage, disableLanguage), vscode.commands.registerCommand(exports.commandTest, testCommand), registration, makeDisposable(subOnDidChangeTextDocument));
}
exports.activate = activate;
//# sourceMappingURL=cSpellInfo.js.map