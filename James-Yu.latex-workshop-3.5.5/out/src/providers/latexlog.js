"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class LaTeXLogProvider {
    constructor(extension) {
        this.change = new vscode.EventEmitter();
        this.extension = extension;
    }
    update(uri) {
        this.change.fire(uri);
    }
    get onDidChange() {
        return this.change.event;
    }
    provideTextDocumentContent(_uri) {
        const dom = this.extension.parser.buildLogRaw.split('\n').map(log => `<span>${log.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")}</span><br>`);
        return `
            <!DOCTYPE html style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;"><html><head></head>
            <body style="position:absolute; left: 0; top: 0; width: 100%; height: 100%; white-space: pre;">${dom.join('')}</body></html>
        `;
    }
}
exports.LaTeXLogProvider = LaTeXLogProvider;
//# sourceMappingURL=latexlog.js.map