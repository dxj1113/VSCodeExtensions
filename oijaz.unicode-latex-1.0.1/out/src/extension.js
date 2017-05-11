'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var latex_1 = require('./latex');
var RE_LATEX_NAME = /(\\\S+)/g;
var latexItems = [];
var pickOptions = {
    matchOnDescription: true,
};
function activate(context) {
    latexItems = [];
    for (var name in latex_1.latexSymbols) {
        latexItems.push({
            description: name,
            label: latex_1.latexSymbols[name],
        });
    }
    var insertion = vscode.commands.registerCommand('unicode-latex.insertMathSymbol', function () {
        vscode.window.showQuickPick(latexItems, pickOptions).then(insertSymbol);
    });
    var replacement = vscode.commands.registerCommand('unicode-latex.replaceLatexNames', function () {
        replaceWithUnicode(vscode.window.activeTextEditor);
    });
    context.subscriptions.push(insertion);
    context.subscriptions.push(replacement);
}
exports.activate = activate;
function insertSymbol(item) {
    if (!item) {
        return;
    }
    var editor = vscode.window.activeTextEditor;
    editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
    }).then(function () {
        editor.edit(function (editBuilder) {
            editBuilder.insert(editor.selection.start, item.label);
        });
    });
}
function replaceWithUnicode(editor) {
    var selection = (function () {
        if (editor.selection.start.isBefore(editor.selection.end)) {
            return editor.selection;
        }
        else {
            var endLine = editor.document.lineAt(editor.document.lineCount - 1);
            return new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(endLine.lineNumber, endLine.text.length));
        }
    })();
    var text = editor.document.getText(selection);
    var replacement = text.replace(RE_LATEX_NAME, function (m) {
        if (latex_1.latexSymbols.hasOwnProperty(m)) {
            return latex_1.latexSymbols[m];
        }
        return m;
    });
    editor.edit(function (editBuilder) {
        editBuilder.replace(selection, replacement);
    });
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map