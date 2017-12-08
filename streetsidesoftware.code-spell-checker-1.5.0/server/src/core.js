"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
var logger_2 = require("./logger");
exports.LogLevel = logger_2.LogLevel;
const vscode_uri_1 = require("vscode-uri");
let workspaceBase = '';
let workspaceFolders = [];
exports.logger = new logger_1.Logger();
function log(msg, uri) {
    exports.logger.log(formatMessage(msg, uri));
}
exports.log = log;
function logError(msg, uri) {
    exports.logger.error(formatMessage(msg, uri));
}
exports.logError = logError;
function logInfo(msg, uri) {
    exports.logger.info(formatMessage(msg, uri));
}
exports.logInfo = logInfo;
function setWorkspaceBase(uri) {
    workspaceBase = vscode_uri_1.default.parse(uri).fsPath;
    log(`setWorkspaceBase: ${workspaceBase}`);
}
exports.setWorkspaceBase = setWorkspaceBase;
function setWorkspaceFolders(folders) {
    workspaceFolders = folders.map(folder => vscode_uri_1.default.parse(folder).fsPath);
    setWorkspaceBase(findCommonBasis(workspaceFolders));
}
exports.setWorkspaceFolders = setWorkspaceFolders;
function formatMessage(msg, uri) {
    const uris = Array.isArray(uri) ? uri : [uri];
    return msg + '\t' + uris.map(normalizeUri).join('\n\t\t\t');
}
function normalizeUri(uri) {
    if (!uri) {
        return '';
    }
    uri = vscode_uri_1.default.parse(uri).fsPath;
    const base = findCommonBase(uri, workspaceBase);
    return uri.replace(base, '...');
}
function findCommonBasis(folders) {
    return folders.reduce((a, b) => findCommonBase(a || b, b), '');
}
function findCommonBase(a, b) {
    const limit = matchingUriLength(a, b);
    return a.slice(0, limit);
}
function matchingUriLength(a, b) {
    const sep = '/';
    const aParts = a.split(sep);
    const bParts = b.split(sep);
    const limit = Math.min(aParts.length, bParts.length);
    let i = 0;
    for (i = 0; i < limit && aParts[i] === bParts[i]; i += 1) { }
    return aParts.slice(0, i).join(sep).length;
}
//# sourceMappingURL=core.js.map