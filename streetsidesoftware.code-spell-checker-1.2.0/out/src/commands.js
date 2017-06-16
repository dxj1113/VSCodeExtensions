"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CSpellSettings = require("./CSpellSettings");
const Settings = require("./settings");
const vscode_1 = require("vscode");
function handlerApplyTextEdits(client) {
    return function applyTextEdits(uri, documentVersion, edits) {
        const textEditor = vscode_1.window.activeTextEditor;
        if (textEditor && textEditor.document.uri.toString() === uri) {
            if (textEditor.document.version !== documentVersion) {
                vscode_1.window.showInformationMessage(`Spelling changes are outdated and cannot be applied to the document.`);
            }
            textEditor.edit(mutator => {
                for (const edit of edits) {
                    mutator.replace(client.protocol2CodeConverter.asRange(edit.range), edit.newText);
                }
            }).then((success) => {
                if (!success) {
                    vscode_1.window.showErrorMessage('Failed to apply spelling changes to the document.');
                }
            });
        }
    };
}
exports.handlerApplyTextEdits = handlerApplyTextEdits;
function addWordToWorkspaceDictionary(word) {
    if (!Settings.hasWorkspaceLocation()) {
        return addWordToUserDictionary(word);
    }
    return Settings.getSettings()
        .then(foundSettingsInfo => {
        const path = foundSettingsInfo.path;
        if (path) {
            return CSpellSettings.addWordToSettingsAndUpdate(path, word)
                .then(_ => { });
        }
    });
}
exports.addWordToWorkspaceDictionary = addWordToWorkspaceDictionary;
function addWordToUserDictionary(word) {
    return Settings.addWordToSettings(true, word);
}
exports.addWordToUserDictionary = addWordToUserDictionary;
function enableLanguageId(languageId) {
    if (languageId) {
        return Settings.enableLanguage(true, languageId)
            .then(() => {
            // Add it from the workspace as well if necessary
            const allSettings = Settings.getEnabledLanguagesFromAllConfigs();
            if (allSettings && allSettings.workspaceValue) {
                return Settings.enableLanguage(false, languageId);
            }
        });
    }
    return Promise.resolve();
}
exports.enableLanguageId = enableLanguageId;
function disableLanguageId(languageId) {
    if (languageId) {
        return Settings.disableLanguage(true, languageId)
            .then(() => {
            // Remove it from the workspace as well if necessary
            const allSettings = Settings.getEnabledLanguagesFromAllConfigs();
            if (allSettings && allSettings.workspaceValue) {
                return Settings.disableLanguage(false, languageId);
            }
        });
    }
    return Promise.resolve();
}
exports.disableLanguageId = disableLanguageId;
function userCommandAddWordToDictionary(prompt, fnAddWord) {
    return function () {
        const { activeTextEditor = {} } = vscode_1.window;
        const { selection, document } = activeTextEditor;
        const range = selection && document ? document.getWordRangeAtPosition(selection.active) : undefined;
        const value = range ? document.getText(selection) || document.getText(range) : '';
        vscode_1.window.showInputBox({ prompt, value }).then(word => {
            if (word) {
                fnAddWord(word);
            }
        });
    };
}
exports.userCommandAddWordToDictionary = userCommandAddWordToDictionary;
//# sourceMappingURL=commands.js.map