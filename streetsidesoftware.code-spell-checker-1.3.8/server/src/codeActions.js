"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LangServer = require("vscode-languageserver");
const cspell_1 = require("cspell");
const Validator = require("./validator");
const cspell = require("cspell");
const defaultNumSuggestions = 10;
function extractText(textDocument, range) {
    const { start, end } = range;
    const offStart = textDocument.offsetAt(start);
    const offEnd = textDocument.offsetAt(end);
    return textDocument.getText().slice(offStart, offEnd);
}
function onCodeActionHandler(documents, fnSettings) {
    const settingsCache = new Map();
    function getSettings(doc) {
        const cached = settingsCache.get(doc.uri);
        if (!cached || cached.version !== doc.version) {
            const docSetting = cspell.constructSettingsForText(fnSettings(), doc.getText(), doc.languageId);
            const dict = cspell.getDictionary(docSetting);
            settingsCache.set(doc.uri, { version: doc.version, settings: [docSetting, dict] });
        }
        return settingsCache.get(doc.uri).settings;
    }
    return (params) => {
        const commands = [];
        const { context, textDocument: { uri } } = params;
        const { diagnostics } = context;
        const textDocument = documents.get(uri);
        const [docSetting, dictionary] = getSettings(textDocument);
        const { numSuggestions = defaultNumSuggestions } = docSetting;
        function replaceText(range, text) {
            return LangServer.TextEdit.replace(range, text || '');
        }
        function genMultiWordSugs(words) {
            const snakeCase = words.join('_').toLowerCase();
            const camelCase = cspell_1.Text.snakeToCamel(snakeCase);
            return [
                snakeCase,
                cspell_1.Text.ucFirst(camelCase),
                cspell_1.Text.lcFirst(camelCase)
            ];
        }
        return dictionary.then(dictionary => {
            const spellCheckerDiags = diagnostics.filter(diag => diag.source === Validator.diagSource);
            let altWord;
            for (const diag of spellCheckerDiags) {
                const word = extractText(textDocument, diag.range);
                altWord = altWord || word;
                const sugs = dictionary.suggest(word, numSuggestions).map(sr => sr.word);
                sugs
                    .map(sug => cspell_1.Text.matchCase(word, sug))
                    .forEach(sugWord => {
                    commands.push(LangServer.Command.create(sugWord, 'cSpell.editText', uri, textDocument.version, [replaceText(diag.range, sugWord)]));
                    const words = sugWord.replace(/[ \-_.]/, '_').split('_');
                    if (words.length > 1) {
                        if (cspell_1.Text.isUpperCase(word)) {
                            const sug = words.join('_').toUpperCase();
                            commands.push(LangServer.Command.create(sug, 'cSpell.editText', uri, textDocument.version, [replaceText(diag.range, sug)]));
                        }
                        else {
                            genMultiWordSugs(words).forEach(sugWord => {
                                commands.push(LangServer.Command.create(sugWord, 'cSpell.editText', uri, textDocument.version, [replaceText(diag.range, sugWord)]));
                            });
                        }
                    }
                });
            }
            const word = extractText(textDocument, params.range) || altWord;
            // Only suggest adding if it is our diagnostic and there is a word.
            if (word && spellCheckerDiags.length) {
                commands.push(LangServer.Command.create('Add: "' + word + '" to dictionary', 'cSpell.addWordToUserDictionarySilent', word));
                // Allow the them to add it to the project dictionary.
                commands.push(LangServer.Command.create('Add: "' + word + '" to project dictionary', 'cSpell.addWordToDictionarySilent', word));
            }
            return commands;
        });
    };
}
exports.onCodeActionHandler = onCodeActionHandler;
//# sourceMappingURL=codeActions.js.map