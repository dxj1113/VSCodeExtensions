"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageclient_1 = require("vscode-languageclient");
const vscode = require("vscode");
const Settings = require("../settings");
const LanguageIds = require("../settings/languageIds");
const util_1 = require("../util");
// The debug options for the server
const debugOptions = { execArgv: ['--nolazy', '--debug=60048'] };
const methodNames = {
    isSpellCheckEnabled: 'isSpellCheckEnabled',
    getConfigurationForDocument: 'getConfigurationForDocument',
    splitTextIntoWords: 'splitTextIntoWords',
};
class CSpellClient {
    /**
     * @param: {string} module -- absolute path to the server module.
     */
    constructor(module, languageIds) {
        this.import = new Set();
        const enabledLanguageIds = Settings.getSettingFromVSConfig('enabledLanguageIds');
        const scheme = 'file';
        const uniqueLangIds = languageIds
            .concat(enabledLanguageIds || [])
            .concat(LanguageIds.languageIds)
            .filter(util_1.uniqueFilter());
        const documentSelector = uniqueLangIds.map(language => ({ language, scheme }))
            .concat(uniqueLangIds.map(language => ({ language, scheme: 'untitled' })));
        // Options to control the language client
        const clientOptions = {
            documentSelector,
            diagnosticCollectionName: 'cSpell Checker',
            synchronize: {
                // Synchronize the setting section 'spellChecker' to the server
                configurationSection: ['cSpell', 'search']
            }
        };
        // If the extension is launched in debug mode the debug server options are use
        // Otherwise the run options are used
        const serverOptions = {
            run: { module, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: { module, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
        };
        // Create the language client and start the client.
        this.client = new vscode_languageclient_1.LanguageClient('cspell', 'Code Spell Checker', serverOptions, clientOptions);
    }
    needsStart() {
        return this.client.needsStart();
    }
    needsStop() {
        return this.client.needsStop();
    }
    start() {
        return this.client.start();
    }
    isSpellCheckEnabled(document) {
        const { uri, languageId = '' } = document;
        if (!uri || !languageId) {
            return Promise.resolve({});
        }
        return this.client.onReady().then(() => this.client.sendRequest(methodNames.isSpellCheckEnabled, { uri: uri.toString(), languageId }))
            .then((response) => response);
    }
    getConfigurationForDocument(document) {
        const { uri, languageId = '' } = document;
        if (!uri || !languageId) {
            return Promise.resolve({});
        }
        return this.client.onReady().then(() => this.client.sendRequest(methodNames.getConfigurationForDocument, { uri: uri.toString(), languageId }));
    }
    splitTextIntoDictionaryWords(text) {
        return this.client.onReady().then(() => this.client.sendRequest(methodNames.splitTextIntoWords, text));
    }
    applySettings(settings) {
        return this.client.onReady().then(() => this.client.sendNotification('applySettings', { settings }));
    }
    registerConfiguration(path) {
        return this.client.onReady().then(() => this.client.sendNotification('registerConfigurationFile', path));
    }
    get diagnostics() {
        return (this.client && this.client.diagnostics) || undefined;
    }
    triggerSettingsRefresh() {
        const workspaceConfig = vscode.workspace.getConfiguration();
        const cSpell = workspaceConfig.get('cSpell');
        const search = workspaceConfig.get('search');
        this.applySettings({ cSpell, search });
    }
    static create(module) {
        return vscode.languages.getLanguages().then(langIds => new CSpellClient(module, langIds));
    }
}
exports.CSpellClient = CSpellClient;
//# sourceMappingURL=client.js.map