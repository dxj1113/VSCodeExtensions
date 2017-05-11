"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const settings_1 = require("./settings");
const cSpellInfoPreview = require("./cSpellInfo");
const cSpellClient_1 = require("./cSpellClient");
const vscode_1 = require("vscode");
const vscode = require("vscode");
const statusbar_1 = require("./statusbar");
const commands_1 = require("./commands");
const commands = require("./commands");
function activate(context) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'src', 'server.js'));
    // Get the cSpell Client
    cSpellClient_1.CSpellClient.create(serverModule).then(client => {
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
        context.subscriptions.push(clientDispose, vscode.commands.registerCommand('cSpell.editText', commands_1.handlerApplyTextEdits(client.client)), vscode.commands.registerCommand('cSpell.addWordToDictionarySilent', commands.addWordToWorkspaceDictionary), vscode.commands.registerCommand('cSpell.addWordToUserDictionarySilent', commands.addWordToUserDictionary), vscode.commands.registerCommand('cSpell.addWordToDictionary', actionAddWordToWorkspace), vscode.commands.registerCommand('cSpell.addWordToUserDictionary', actionAddWordToDictionary), vscode.commands.registerCommand('cSpell.enableLanguage', commands.enableLanguageId), vscode.commands.registerCommand('cSpell.disableLanguage', commands.disableLanguageId), vscode.commands.registerCommand('cSpell.enableForWorkspace', () => settings_1.setEnableSpellChecking(true, false)), vscode.commands.registerCommand('cSpell.disableForWorkspace', () => settings_1.setEnableSpellChecking(false, false)), configWatcher.onDidChange(triggerGetSettings), configWatcher.onDidCreate(triggerGetSettings), configWatcher.onDidDelete(triggerGetSettings));
        cSpellInfoPreview.activate(context, client);
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map