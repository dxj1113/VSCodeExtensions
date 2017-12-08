"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class LatexCompletionItemProvider {
    constructor(symbols) {
        this.completionItems = Object.keys(symbols).map((key, index) => {
            let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Text);
            item.insertText = symbols[key];
            item.detail = symbols[key];
            return item;
        });
    }
    provideCompletionItems(doc, pos) {
        const word = doc.getWordRangeAtPosition(pos, /\\[\^_]?[^\s\\]*/);
        if (!word) {
            return [];
        }
        return this.completionItems.map((item) => {
            item.range = word;
            return item;
        });
    }
}
exports.LatexCompletionItemProvider = LatexCompletionItemProvider;
//# sourceMappingURL=completion.js.map