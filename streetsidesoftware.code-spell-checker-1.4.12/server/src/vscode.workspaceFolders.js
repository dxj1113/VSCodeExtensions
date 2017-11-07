"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("vscode-languageserver"));
const vscode = require("vscode-languageserver");
function registerOnDidChangeWorkspaceFolders(connection, callback) {
    const notificationType = new vscode.NotificationType('workspace/didChangeWorkspaceFolders');
    connection.onNotification(notificationType, callback);
}
exports.registerOnDidChangeWorkspaceFolders = registerOnDidChangeWorkspaceFolders;
function getDocumentSettings(connection, document) {
    return getConfiguration(connection, document.uri);
}
exports.getDocumentSettings = getDocumentSettings;
function getConfiguration(connection, uri) {
    return connection.workspace.getConfiguration({ scopeUri: uri });
}
exports.getConfiguration = getConfiguration;
function getWorkspaceFolders(connection) {
    return connection.workspace.getWorkspaceFolders();
}
exports.getWorkspaceFolders = getWorkspaceFolders;
//# sourceMappingURL=vscode.workspaceFolders.js.map