'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const configSettings_1 = require("../common/configSettings");
const editor_1 = require("../common/editor");
const installer_1 = require("../common/installer");
const proxy_1 = require("../refactor/proxy");
const telemetry_1 = require("../telemetry");
const constants_1 = require("../telemetry/constants");
const EXTENSION_DIR = path.join(__dirname, '..', '..', '..');
class PythonRenameProvider {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.installer = new installer_1.Installer(outputChannel);
    }
    provideRenameEdits(document, position, newName, token) {
        return vscode.workspace.saveAll(false).then(() => {
            return this.doRename(document, position, newName, token);
        });
    }
    doRename(document, position, newName, token) {
        if (document.lineAt(position.line).text.match(/^\s*\/\//)) {
            return;
        }
        if (position.character <= 0) {
            return;
        }
        const range = document.getWordRangeAtPosition(position);
        if (!range || range.isEmpty) {
            return;
        }
        const oldName = document.getText(range);
        if (oldName === newName) {
            return;
        }
        let workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder && Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
            workspaceFolder = vscode.workspace.workspaceFolders[0];
        }
        const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : __dirname;
        const pythonSettings = configSettings_1.PythonSettings.getInstance(workspaceFolder ? workspaceFolder.uri : undefined);
        const proxy = new proxy_1.RefactorProxy(EXTENSION_DIR, pythonSettings, workspaceRoot);
        return proxy.rename(document, newName, document.uri.fsPath, range).then(response => {
            const fileDiffs = response.results.map(fileChanges => fileChanges.diff);
            return editor_1.getWorkspaceEditsFromPatch(fileDiffs, workspaceRoot);
        }).catch(reason => {
            if (reason === 'Not installed') {
                this.installer.promptToInstall(installer_1.Product.rope, document.uri);
                return Promise.reject('');
            }
            else {
                vscode.window.showErrorMessage(reason);
                this.outputChannel.appendLine(reason);
            }
            return Promise.reject(reason);
        });
    }
}
__decorate([
    telemetry_1.captureTelemetry(constants_1.REFACTOR_RENAME)
], PythonRenameProvider.prototype, "provideRenameEdits", null);
exports.PythonRenameProvider = PythonRenameProvider;
//# sourceMappingURL=renameProvider.js.map