"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const Rx = require("rxjs/Rx");
const cspell_1 = require("cspell");
exports.diagSource = 'cSpell Checker';
var cspell_2 = require("cspell");
exports.validateText = cspell_2.validateText;
exports.defaultCheckLimit = 500;
function validateTextDocument(textDocument, options) {
    return validateTextDocumentAsync(textDocument, options)
        .toArray()
        .toPromise();
}
exports.validateTextDocument = validateTextDocument;
function validateTextDocumentAsync(textDocument, options) {
    const limit = (options.checkLimit || exports.defaultCheckLimit) * 1024;
    const text = textDocument.getText().slice(0, limit);
    return Rx.Observable.fromPromise(cspell_1.validateText(text, options))
        .flatMap(a => a)
        .filter(a => !!a)
        .map(a => a)
        .map(offsetWord => (Object.assign({}, offsetWord, { position: textDocument.positionAt(offsetWord.offset) })))
        .map(word => (Object.assign({}, word, { range: {
            start: word.position,
            end: (Object.assign({}, word.position, { character: word.position.character + word.text.length }))
        } })))
        .map(({ text, range }) => ({
        severity: vscode_languageserver_1.DiagnosticSeverity.Information,
        range: range,
        message: `Unknown word: "${text}"`,
        source: exports.diagSource
    }));
}
exports.validateTextDocumentAsync = validateTextDocumentAsync;
//# sourceMappingURL=validator.js.map