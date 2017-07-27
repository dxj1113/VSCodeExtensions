"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const spellchecker = require("simple-spellchecker");
class Checker {
    constructor(extension) {
        this.errors = {};
        this.checkerDiagnostics = vscode.languages.createDiagnosticCollection('Spell Check');
        this.extension = extension;
        this.spell = spellchecker.getDictionarySync('en-US', `${__dirname}/../../dicts`);
        this.spell.check = this.spell.spellCheck;
        this.extension.logger.addLogMessage(`Dictionary files loaded`);
    }
    check(doc, line = undefined) {
        if (!this.spell) {
            return;
        }
        if (!this.errors[doc.fileName]) {
            this.errors[doc.fileName] = [];
        }
        let lines;
        if (line) {
            lines = [doc.lineAt(line).text];
        }
        else {
            lines = doc.getText().split('\n');
        }
        for (let lineIdx = 0; lineIdx < lines.length; ++lineIdx) {
            let content = lines[lineIdx];
            const realLineIdx = line ? line : lineIdx;
            content = this.remove(content, /\\\w*(\[.*?\])?(\{.*?\})?/g);
            content = this.remove(content, /\$.+?\$/g);
            content = this.remove(content, /\[-?@[A-Za-z:0-9\-]*\]/g);
            content = this.remove(content, /\{(\#|\.)[A-Za-z:0-9]+\}/g);
            content = this.remove(content, /[a-zA-Z.\-0-9]+@[a-z.]+/g);
            content = this.remove(content, /(http|https|ftp|git)\S*/g);
            content = this.remove(content, /\(.*\.(jpg|jpeg|png|md|gif|pdf|svg)\)/gi);
            content = this.remove(content, /[`\"!#$%&()*+,.\/:;<=>?-]/g);
            content = this.remove(content, / [0-9]+/g);
            content = this.remove(content, /\t/g);
            content = this.remove(content, /' /g);
            content = content.replace(/[\s]['"]([a-zA-Z0-9])/g, ' $1');
            this.errors[doc.fileName][realLineIdx] = [undefined];
            content.split(/[\s']/).forEach(token => {
                if (token.length < 4 || /[@\[\]\\^_{|}\n\r\~]/.exec(token) || this.spell.check(token)) {
                    return;
                }
                const colNum = lines[lineIdx].indexOf(token);
                const error = {
                    from: colNum,
                    to: colNum + token.length,
                    text: token
                };
                lines[lineIdx].replace(token, Array(token.length + 1).join(' '));
                if (!this.errors[doc.fileName][realLineIdx]) {
                    this.errors[doc.fileName][realLineIdx] = [error];
                }
                else {
                    this.errors[doc.fileName][realLineIdx].push(error);
                }
            });
        }
        this.showDiagnostics(doc.fileName);
    }
    showDiagnostics(file) {
        const diagsCollection = [];
        for (let lineIdx = 0; lineIdx < this.errors[file].length; ++lineIdx) {
            this.errors[file][lineIdx].forEach(error => {
                if (!error) {
                    return;
                }
                const range = new vscode.Range(new vscode.Position(lineIdx, error.from), new vscode.Position(lineIdx, error.to));
                const diag = new vscode.Diagnostic(range, `Mis-spelled: ${error.text}`, vscode.DiagnosticSeverity.Error);
                diag.source = 'Spell Check';
                diagsCollection.push(diag);
            });
        }
        this.checkerDiagnostics.clear();
        this.checkerDiagnostics.set(vscode.Uri.file(file), diagsCollection);
    }
    remove(content, regex) {
        return content.replace(regex, ' ');
    }
}
exports.Checker = Checker;
//# sourceMappingURL=checker.js.map