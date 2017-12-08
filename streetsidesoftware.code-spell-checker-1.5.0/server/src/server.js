"use strict";
// cSpell:ignore pycache
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode = require("vscode-languageserver");
const Validator = require("./validator");
const Rx = require("rxjs/Rx");
const codeActions_1 = require("./codeActions");
const cspell_1 = require("cspell");
const CSpell = require("cspell");
const cspell_2 = require("cspell");
const documentSettings_1 = require("./documentSettings");
const core_1 = require("./core");
core_1.log('Starting Spell Checker Server');
const methodNames = {
    isSpellCheckEnabled: 'isSpellCheckEnabled',
    getConfigurationForDocument: 'getConfigurationForDocument',
    splitTextIntoWords: 'splitTextIntoWords',
};
const notifyMethodNames = {
    onConfigChange: 'onConfigChange',
    registerConfigurationFile: 'registerConfigurationFile',
};
const tds = CSpell;
const defaultCheckLimit = Validator.defaultCheckLimit;
// Turn off the spell checker by default. The setting files should have it set.
// This prevents the spell checker from running too soon.
const defaultSettings = Object.assign({}, CSpell.mergeSettings(cspell_2.getDefaultSettings(), CSpell.getGlobalSettings()), { checkLimit: defaultCheckLimit, enabled: false });
const defaultDebounce = 50;
function run() {
    // debounce buffer
    const validationRequestStream = new Rx.ReplaySubject(1);
    const triggerUpdateConfig = new Rx.ReplaySubject(1);
    const triggerValidateAll = new Rx.ReplaySubject(1);
    const validationByDoc = new Map();
    let isValidationBusy = false;
    // Create a connection for the server. The connection uses Node's IPC as a transport
    core_1.log('Create Connection');
    const connection = vscode_languageserver_1.createConnection(vscode.ProposedFeatures.all);
    const documentSettings = new documentSettings_1.DocumentSettings(connection, defaultSettings);
    // Create a simple text document manager. The text document manager
    // supports full document sync only
    const documents = new vscode_languageserver_1.TextDocuments();
    connection.onInitialize((params, token) => {
        // Hook up the logger to the connection.
        core_1.log('onInitialize');
        core_1.setWorkspaceBase(params.rootUri ? params.rootUri : '');
        return {
            capabilities: {
                // Tell the client that the server works in FULL text document sync mode
                textDocumentSync: documents.syncKind,
                codeActionProvider: true
            }
        };
    });
    // The settings have changed. Is sent on server activation as well.
    connection.onDidChangeConfiguration(onConfigChange);
    function onConfigChange(change) {
        core_1.logInfo('Configuration Change');
        triggerUpdateConfig.next(undefined);
        updateLogLevel();
    }
    function updateActiveSettings() {
        core_1.log('updateActiveSettings');
        documentSettings.resetSettings();
        triggerValidateAll.next(undefined);
    }
    function getActiveSettings(doc) {
        return getActiveUriSettings(doc.uri);
    }
    function getActiveUriSettings(uri) {
        return documentSettings.getUriSettings(uri);
    }
    function registerConfigurationFile(path) {
        documentSettings.registerConfigurationFile(path);
        core_1.logInfo('Register Configuration File', path);
        triggerUpdateConfig.next(undefined);
    }
    // Listen for event messages from the client.
    connection.onNotification(notifyMethodNames.onConfigChange, onConfigChange);
    connection.onNotification(notifyMethodNames.registerConfigurationFile, registerConfigurationFile);
    connection.onRequest(methodNames.isSpellCheckEnabled, async (params) => {
        const { uri, languageId } = params;
        const fileEnabled = uri ? !await isUriExcluded(uri) : undefined;
        const settings = await getActiveUriSettings(uri);
        return {
            languageEnabled: languageId && uri ? await isLanguageEnabled({ uri, languageId }, settings) : undefined,
            fileEnabled,
        };
    });
    connection.onRequest(methodNames.getConfigurationForDocument, async (params) => {
        const { uri, languageId } = params;
        const doc = uri && documents.get(uri);
        const docSettings = doc && await getSettingsToUseForDocument(doc) || undefined;
        const settings = await getActiveUriSettings(uri);
        return {
            languageEnabled: languageId && doc ? await isLanguageEnabled(doc, settings) : undefined,
            fileEnabled: uri ? !await isUriExcluded(uri) : undefined,
            settings,
            docSettings,
        };
    });
    function textToWords(text) {
        const setOfWords = new Set(cspell_1.Text.extractWordsFromCode(text)
            .map(t => t.text)
            .map(t => t.toLowerCase()));
        return [...setOfWords];
    }
    connection.onRequest(methodNames.splitTextIntoWords, (text) => {
        return {
            words: textToWords(text),
        };
    });
    // validate documents
    const disposableValidate = validationRequestStream
        .filter(doc => !validationByDoc.has(doc.uri))
        .subscribe(doc => {
        if (!validationByDoc.has(doc.uri)) {
            const uri = doc.uri;
            validationByDoc.set(doc.uri, validationRequestStream
                .filter(doc => uri === doc.uri)
                .do(doc => core_1.log('Request Validate:', doc.uri))
                .debounceTime(50)
                .do(doc => core_1.log('Request Validate 2:', doc.uri))
                .flatMap(async (doc) => ({ doc, settings: await getActiveSettings(doc) }))
                .debounce(dsp => Rx.Observable
                .timer(dsp.settings.spellCheckDelayMs || defaultDebounce)
                .filter(() => !isValidationBusy))
                .flatMap(validateTextDocument)
                .subscribe(diag => connection.sendDiagnostics(diag)));
        }
    });
    const disposableTriggerUpdateConfigStream = triggerUpdateConfig
        .do(() => core_1.log('Trigger Update Config'))
        .debounceTime(100)
        .subscribe(() => {
        updateActiveSettings();
    });
    const disposableTriggerValidateAll = triggerValidateAll
        .debounceTime(250)
        .subscribe(() => {
        core_1.log('Validate all documents');
        documents.all().forEach(doc => validationRequestStream.next(doc));
    });
    async function shouldValidateDocument(textDocument, settings) {
        const { uri } = textDocument;
        return !!settings.enabled && isLanguageEnabled(textDocument, settings)
            && !await isUriExcluded(uri);
    }
    function isLanguageEnabled(textDocument, settings) {
        const { enabledLanguageIds = [] } = settings;
        return enabledLanguageIds.indexOf(textDocument.languageId) >= 0;
    }
    async function isUriExcluded(uri) {
        return documentSettings.isExcluded(uri);
    }
    async function getBaseSettings(doc) {
        const settings = await getActiveSettings(doc);
        return Object.assign({}, CSpell.mergeSettings(defaultSettings, settings), { enabledLanguageIds: settings.enabledLanguageIds });
    }
    async function getSettingsToUseForDocument(doc) {
        return tds.constructSettingsForText(await getBaseSettings(doc), doc.getText(), doc.languageId);
    }
    async function validateTextDocument(dsp) {
        async function validate() {
            const { doc, settings } = dsp;
            const uri = doc.uri;
            try {
                const shouldCheck = await shouldValidateDocument(doc, settings);
                if (!shouldCheck) {
                    core_1.log('validateTextDocument skip:', uri);
                    return { uri, diagnostics: [] };
                }
                const settingsToUse = await getSettingsToUseForDocument(doc);
                if (settingsToUse.enabled) {
                    core_1.logInfo('Validate File', uri);
                    core_1.log('validateTextDocument start:', uri);
                    const diagnostics = await Validator.validateTextDocument(doc, settingsToUse);
                    core_1.log('validateTextDocument done:', uri);
                    return { uri, diagnostics };
                }
            }
            catch (e) {
                core_1.logError(`validateTextDocument: ${JSON.stringify(e)}`);
            }
            return { uri, diagnostics: [] };
        }
        isValidationBusy = true;
        const r = await validate();
        isValidationBusy = false;
        return r;
    }
    // Make the text document manager listen on the connection
    // for open, change and close text document events
    documents.listen(connection);
    // The content of a text document has changed. This event is emitted
    // when the text document first opened or when its content has changed.
    documents.onDidChangeContent((change) => {
        validationRequestStream.next(change.document);
    });
    documents.onDidClose((event) => {
        const uri = event.document.uri;
        const sub = validationByDoc.get(uri);
        if (sub) {
            validationByDoc.delete(uri);
            sub.unsubscribe();
        }
        // A text document was closed we clear the diagnostics
        connection.sendDiagnostics({ uri, diagnostics: [] });
    });
    connection.onCodeAction(codeActions_1.onCodeActionHandler(documents, getBaseSettings, () => documentSettings.version));
    // Listen on the connection
    connection.listen();
    // Free up the validation streams on shutdown.
    connection.onShutdown(() => {
        disposableValidate.unsubscribe();
        disposableTriggerUpdateConfigStream.unsubscribe();
        disposableTriggerValidateAll.unsubscribe();
        const toDispose = [...validationByDoc.values()];
        validationByDoc.clear();
        toDispose.forEach(sub => sub.unsubscribe());
    });
    function updateLogLevel() {
        connection.workspace.getConfiguration({ section: 'cSpell.debugLevel' }).then((result) => {
            fetchFolders();
            core_1.logger.level = result;
            core_1.logger.setConnection(connection);
        }, (reject) => {
            fetchFolders();
            core_1.logger.level = core_1.LogLevel.DEBUG;
            core_1.logger.error(`Failed to get config: ${JSON.stringify(reject)}`);
            core_1.logger.setConnection(connection);
        });
    }
    async function fetchFolders() {
        const folders = await connection.workspace.getWorkspaceFolders();
        if (folders) {
            core_1.setWorkspaceFolders(folders.map(f => f.uri));
        }
        else {
            core_1.setWorkspaceFolders([]);
        }
    }
}
run();
//# sourceMappingURL=server.js.map