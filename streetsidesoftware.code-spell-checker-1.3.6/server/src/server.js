"use strict";
// cSpell:ignore pycache
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const Validator = require("./validator");
const Rx = require("rxjs/Rx");
const codeActions_1 = require("./codeActions");
const cspell_1 = require("cspell");
const path = require("path");
const CSpell = require("cspell");
const cspell_2 = require("cspell");
const { extractGlobsFromExcludeFilesGlobMap, generateExclusionFunctionForUri, } = cspell_1.ExclusionHelper;
const tds = CSpell;
const defaultSettings = CSpell.mergeSettings(cspell_2.getDefaultSettings(), CSpell.getGlobalSettings());
const activeSettings = Object.assign({}, defaultSettings);
const vscodeSettings = {};
const defaultDebounce = 50;
const defaultExclude = [
    'debug:*',
    'debug:/**',
    'vscode:/**',
    'private:/**',
    'markdown:/**',
    'git-index:/**',
    '**/*.rendered',
    '**/*.*.rendered',
    '__pycache__/**',
];
const configsToImport = new Set();
let fnFileExclusionTest = () => false;
function run() {
    // debounce buffer
    const validationRequestStream = new Rx.ReplaySubject(1);
    const validationFinishedStream = new Rx.ReplaySubject(1);
    const triggerUpdateConfig = new Rx.ReplaySubject(1);
    // Create a connection for the server. The connection uses Node's IPC as a transport
    const connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
    // Create a simple text document manager. The text document manager
    // supports full document sync only
    const documents = new vscode_languageserver_1.TextDocuments();
    // After the server has started the client sends an initialize request. The server receives
    // in the passed params the rootPath of the workspace plus the client capabilities.
    let workspaceRoot;
    connection.onInitialize((params, token) => {
        workspaceRoot = params.rootPath || undefined;
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
        Object.assign(vscodeSettings, change.settings || {});
        triggerUpdateConfig.next(undefined);
    }
    function updateActiveSettings() {
        CSpell.clearCachedSettings();
        const configPaths = workspaceRoot ? [
            path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename.toLowerCase()),
            path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename),
            path.join(workspaceRoot, CSpell.defaultSettingsFilename.toLowerCase()),
            path.join(workspaceRoot, CSpell.defaultSettingsFilename),
        ] : [];
        const cSpellSettingsFile = CSpell.readSettingsFiles(configPaths);
        const { cSpell = {}, search = {} } = vscodeSettings;
        const { exclude = {} } = search;
        const importPaths = [...configsToImport.keys()].sort();
        const importSettings = CSpell.readSettingsFiles(importPaths);
        const mergedSettings = CSpell.mergeSettings(defaultSettings, importSettings, cSpellSettingsFile, cSpell);
        const { ignorePaths = [] } = mergedSettings;
        const globs = defaultExclude.concat(ignorePaths, extractGlobsFromExcludeFilesGlobMap(exclude));
        fnFileExclusionTest = generateExclusionFunctionForUri(globs, workspaceRoot || '');
        Object.assign(activeSettings, mergedSettings);
        documents.all().forEach(doc => validationRequestStream.next(doc));
    }
    function registerConfigurationFile(path) {
        configsToImport.add(path);
        triggerUpdateConfig.next(undefined);
    }
    // Listen for event messages from the client.
    connection.onNotification('applySettings', onConfigChange);
    connection.onNotification('registerConfigurationFile', registerConfigurationFile);
    connection.onRequest('isSpellCheckEnabled', (params) => {
        const { uri, languageId } = params;
        return {
            languageEnabled: languageId ? isLanguageEnabled(languageId) : undefined,
            fileEnabled: uri ? !isUriExcluded(uri) : undefined,
        };
    });
    connection.onRequest('getConfigurationForDocument', (params) => {
        const { uri, languageId } = params;
        const doc = uri && documents.get(uri);
        const docSettings = doc && getSettingsToUseForDocument(doc);
        const settings = activeSettings;
        return {
            languageEnabled: languageId ? isLanguageEnabled(languageId) : undefined,
            fileEnabled: uri ? !isUriExcluded(uri) : undefined,
            settings,
            docSettings,
        };
    });
    // validate documents
    let lastValidated = '';
    let lastDurationSelector;
    const disposeValidationStream = validationRequestStream
        .filter(shouldValidateDocument)
        .debounce(doc => {
        if (doc.uri !== lastValidated && lastDurationSelector) {
            lastDurationSelector.next(0);
        }
        lastDurationSelector = new Rx.Subject();
        Rx.Observable.timer(activeSettings.spellCheckDelayMs || defaultDebounce).subscribe(lastDurationSelector);
        return lastDurationSelector;
    })
        .do(() => lastDurationSelector = undefined)
        .subscribe(validateTextDocument);
    // Clear the diagnostics for documents we do not want to validate
    const disposableSkipValidationStream = validationRequestStream
        .filter(doc => !shouldValidateDocument(doc))
        .subscribe(doc => {
        connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    });
    const disposableTriggerUpdateConfigStream = triggerUpdateConfig
        .debounceTime(100)
        .subscribe(() => {
        updateActiveSettings();
    });
    validationFinishedStream.next({ uri: 'start', version: 0 });
    function shouldValidateDocument(textDocument) {
        const { uri, languageId } = textDocument;
        return !!activeSettings.enabled && isLanguageEnabled(languageId)
            && !isUriExcluded(uri);
    }
    function isLanguageEnabled(languageId) {
        const { enabledLanguageIds = [] } = activeSettings;
        return enabledLanguageIds.indexOf(languageId) >= 0;
    }
    function isUriExcluded(uri) {
        return fnFileExclusionTest(uri);
    }
    function getBaseSettings() {
        return Object.assign({}, CSpell.mergeSettings(defaultSettings, activeSettings), { enabledLanguageIds: activeSettings.enabledLanguageIds });
    }
    function getSettingsToUseForDocument(doc) {
        return tds.constructSettingsForText(getBaseSettings(), doc.getText(), doc.languageId);
    }
    function validateTextDocument(textDocument) {
        try {
            const settingsToUse = getSettingsToUseForDocument(textDocument);
            Validator.validateTextDocument(textDocument, settingsToUse).then(diagnostics => {
                // Send the computed diagnostics to VSCode.
                validationFinishedStream.next(textDocument);
                connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
            });
        }
        catch (e) {
            console.log(e);
        }
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
        // A text document was closed we clear the diagnostics
        connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
    });
    connection.onCodeAction(codeActions_1.onCodeActionHandler(documents, getBaseSettings));
    // Listen on the connection
    connection.listen();
    // Free up the validation streams on shutdown.
    connection.onShutdown(() => {
        disposableSkipValidationStream.unsubscribe();
        disposeValidationStream.unsubscribe();
        disposableTriggerUpdateConfigStream.unsubscribe();
    });
}
run();
//# sourceMappingURL=server.js.map