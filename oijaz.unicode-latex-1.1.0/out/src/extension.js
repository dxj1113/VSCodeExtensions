"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const latex_1 = require("./latex");
const completion_1 = require("./completion");
const RE_LATEX_NAME = /(\\\S+)/g;
let latexItems = [];
let pickOptions = {
    matchOnDescription: true,
};
function activate(context) {
    latexItems = [];
    for (let name in latex_1.latexSymbols) {
        latexItems.push({
            description: name,
            label: latex_1.latexSymbols[name],
        });
    }
    let insertion = vscode.commands.registerCommand('unicode-latex.insertMathSymbol', () => {
        vscode.window.showQuickPick(latexItems, pickOptions).then(insertSymbol);
    });
    let replacement = vscode.commands.registerCommand('unicode-latex.replaceLatexNames', () => {
        replaceWithUnicode(vscode.window.activeTextEditor);
    });
    const selector = ['plaintext', 'markdown'];
    const provider = new completion_1.LatexCompletionItemProvider(latex_1.latexSymbols);
    let completionSub = vscode.languages.registerCompletionItemProvider(selector, provider, '\\');
    context.subscriptions.push(insertion);
    context.subscriptions.push(replacement);
    context.subscriptions.push(completionSub);
}
exports.activate = activate;
function insertSymbol(item) {
    if (!item) {
        return;
    }
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    editor.edit((editBuilder) => {
        editBuilder.delete(editor.selection);
    }).then(() => {
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.start, item.label);
        });
    });
}
function replaceWithUnicode(editor) {
    if (!editor) {
        return;
    }
    // If nothing is selected, select everything
    let selection = (() => {
        if (editor.selection.start.isBefore(editor.selection.end)) {
            return editor.selection;
        }
        else {
            let endLine = editor.document.lineAt(editor.document.lineCount - 1);
            return new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(endLine.lineNumber, endLine.text.length));
        }
    })();
    let text = editor.document.getText(selection);
    let replacement = text.replace(RE_LATEX_NAME, (m) => {
        if (latex_1.latexSymbols.hasOwnProperty(m)) {
            return latex_1.latexSymbols[m];
        }
        return m;
    });
    editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacement);
    });
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map