"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
class Reference {
    constructor(extension) {
        this.referenceInTeX = {};
        this.extension = extension;
    }
    provide() {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions;
        }
        this.refreshTimer = Date.now();
        const suggestions = {};
        Object.keys(this.extension.manager.texFileTree).forEach(filePath => {
            if (filePath in this.referenceInTeX) {
                Object.keys(this.referenceInTeX[filePath]).forEach(key => {
                    if (!(key in suggestions)) {
                        suggestions[key] = this.referenceInTeX[filePath][key];
                    }
                });
            }
        });
        if (vscode.window.activeTextEditor) {
            const items = this.getReferenceItems(vscode.window.activeTextEditor.document.getText());
            Object.keys(items).map(key => {
                if (!(key in suggestions)) {
                    suggestions[key] = items[key];
                }
            });
        }
        this.suggestions = [];
        Object.keys(suggestions).map(key => {
            const item = suggestions[key];
            const command = new vscode.CompletionItem(item.reference, vscode.CompletionItemKind.Reference);
            command.documentation = item.text;
            this.suggestions.push(command);
        });
        return this.suggestions;
    }
    getReferencesTeX(filePath) {
        this.referenceInTeX[filePath] = this.getReferenceItems(fs.readFileSync(filePath, 'utf-8'));
    }
    getReferenceItems(content) {
        const itemReg = /(?:\\label(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g;
        const items = {};
        while (true) {
            const result = itemReg.exec(content);
            if (result === null) {
                break;
            }
            if (!(result[1] in items)) {
                const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1);
                const followLength = content.substring(result.index, content.length).split('\n', 4).join('\n').length;
                items[result[1]] = {
                    reference: result[1],
                    text: `${content.substring(prevContent.lastIndexOf('\n'), result.index + followLength)}\n...`
                };
            }
        }
        return items;
    }
}
exports.Reference = Reference;
//# sourceMappingURL=reference.js.map