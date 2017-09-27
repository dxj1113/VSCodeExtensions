"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const settings_1 = require("./settings");
const settings = require("./settings");
const infoViewer = require("./infoViewer");
const client_1 = require("./client");
const vscode_1 = require("vscode");
const vscode = require("vscode");
const statusbar_1 = require("./statusbar");
const commands_1 = require("./commands");
const commands = require("./commands");
function activate(context) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'src', 'server.js'));
    // Get the cSpell Client
    const server = client_1.CSpellClient.create(serverModule).then(client => {
        const configWatcher = vscode_1.workspace.createFileSystemWatcher(settings_1.configFileWatcherGlob);
        // Start the client.
        const clientDispose = client.start();
        function triggerGetSettings() {
            client.triggerSettingsRefresh();
        }
        const actionAddWordToWorkspace = commands_1.userCommandAddWordToDictionary('Add Word to Workspace Dictionary', commands.addWordToWorkspaceDictionary);
        const actionAddWordToDictionary = commands_1.userCommandAddWordToDictionary('Add Word to Dictionary', commands.addWordToUserDictionary);
        statusbar_1.initStatusBar(context, client);
        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(clientDispose, vscode.commands.registerCommand('cSpell.editText', commands_1.handlerApplyTextEdits(client.client)), vscode.commands.registerCommand('cSpell.addWordToDictionarySilent', commands.addWordToWorkspaceDictionary), vscode.commands.registerCommand('cSpell.addWordToUserDictionarySilent', commands.addWordToUserDictionary), vscode.commands.registerCommand('cSpell.addWordToDictionary', actionAddWordToWorkspace), vscode.commands.registerCommand('cSpell.addWordToUserDictionary', actionAddWordToDictionary), vscode.commands.registerCommand('cSpell.enableLanguage', commands.enableLanguageId), vscode.commands.registerCommand('cSpell.disableLanguage', commands.disableLanguageId), vscode.commands.registerCommand('cSpell.enableForWorkspace', () => settings_1.setEnableSpellChecking(true, false)), vscode.commands.registerCommand('cSpell.disableForWorkspace', () => settings_1.setEnableSpellChecking(false, false)), vscode.commands.registerCommand('cSpell.toggleEnableSpellChecker', commands.toggleEnableSpellChecker), vscode.commands.registerCommand('cSpell.enableCurrentLanguage', commands.enableCurrentLanguage), vscode.commands.registerCommand('cSpell.disableCurrentLanguage', commands.disableCurrentLanguage), configWatcher.onDidChange(triggerGetSettings), configWatcher.onDidCreate(triggerGetSettings), configWatcher.onDidDelete(triggerGetSettings));
        infoViewer.activate(context, client);
        function registerConfig(path) {
            client.registerConfiguration(path);
        }
        return {
            registerConfig,
            triggerGetSettings,
            enableLanguageId: commands.enableLanguageId,
            disableLanguageId: commands.disableLanguageId,
            enableCurrentLanguage: commands.enableCurrentLanguage,
            disableCurrentLanguage: commands.disableCurrentLanguage,
            addWordToUserDictionary: commands.addWordToUserDictionary,
            addWordToWorkspaceDictionary: commands.addWordToWorkspaceDictionary,
            enableLocal: settings.enableLocal,
            disableLocal: settings.disableLocal,
            updateSettings: settings.updateSettings,
        };
    });
    return server;
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map