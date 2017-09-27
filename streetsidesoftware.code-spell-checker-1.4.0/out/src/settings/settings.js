"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const CSpellSettings = require("./CSpellSettings");
const vscode_1 = require("vscode");
const path = require("path");
const vscode = require("vscode");
const util_1 = require("../util");
const config = require("./config");
exports.baseConfigName = CSpellSettings.defaultFileName;
exports.configFileWatcherGlob = `**/{${exports.baseConfigName},${exports.baseConfigName.toLowerCase()}}`;
// This are in preferred order.
const possibleConfigPaths = [
    exports.baseConfigName,
    exports.baseConfigName.toLowerCase(),
    path.join('.vscode', exports.baseConfigName),
    path.join('.vscode', exports.baseConfigName.toLowerCase()),
].join(',');
exports.findConfig = `{${possibleConfigPaths}}`;
function getDefaultWorkspaceConfigLocation() {
    const { rootPath } = vscode_1.workspace;
    return rootPath
        ? path.join(rootPath, '.vscode', exports.baseConfigName)
        : undefined;
}
exports.getDefaultWorkspaceConfigLocation = getDefaultWorkspaceConfigLocation;
function hasWorkspaceLocation() {
    return !!vscode_1.workspace.rootPath;
}
exports.hasWorkspaceLocation = hasWorkspaceLocation;
function findSettingsFiles() {
    return vscode_1.workspace.findFiles(exports.findConfig, '{**/node_modules,**/.git}');
}
exports.findSettingsFiles = findSettingsFiles;
function findSettingsFileLocation() {
    return findSettingsFiles()
        .then(uris => uris.map(uri => uri.fsPath))
        .then(paths => paths.sort((a, b) => a.length - b.length))
        .then(paths => paths[0] || getDefaultWorkspaceConfigLocation());
}
exports.findSettingsFileLocation = findSettingsFileLocation;
function loadTheSettingsFile() {
    return findSettingsFileLocation()
        .then(path => {
        return path ? CSpellSettings.readSettings(path).then(settings => (path ? { path, settings } : undefined)) : undefined;
    });
}
exports.loadTheSettingsFile = loadTheSettingsFile;
function getSettings() {
    return loadTheSettingsFile()
        .then(info => {
        if (!info) {
            const defaultSettings = CSpellSettings.getDefaultSettings();
            const { language = defaultSettings.language } = config.getSettingsFromVSConfig();
            const settings = Object.assign({}, defaultSettings, { language });
            const path = getDefaultWorkspaceConfigLocation() || '';
            return { path, settings };
        }
        return info;
    });
}
exports.getSettings = getSettings;
function setEnableSpellChecking(enabled, isGlobal) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    return config.setSettingInVSConfig('enabled', enabled, useGlobal);
}
exports.setEnableSpellChecking = setEnableSpellChecking;
function getEnabledLanguagesFromAllConfigs() {
    const inspect = config.inspectSettingFromVSConfig('enabledLanguageIds');
    return inspect;
}
exports.getEnabledLanguagesFromAllConfigs = getEnabledLanguagesFromAllConfigs;
function getEnabledLanguagesFromConfig(isGlobal) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    const inspect = getEnabledLanguagesFromAllConfigs() || { key: '' };
    return (useGlobal ? undefined : inspect.workspaceValue) || inspect.globalValue || inspect.defaultValue || [];
}
exports.getEnabledLanguagesFromConfig = getEnabledLanguagesFromConfig;
function enableLanguageIdInConfig(isGlobal, languageId) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    const langs = util_1.unique([languageId, ...getEnabledLanguagesFromConfig(useGlobal)]).sort();
    return config.setSettingInVSConfig('enabledLanguageIds', langs, useGlobal).then(() => langs);
}
exports.enableLanguageIdInConfig = enableLanguageIdInConfig;
function disableLanguageIdInConfig(isGlobal, languageId) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    const langs = getEnabledLanguagesFromConfig(useGlobal).filter(a => a !== languageId).sort();
    return config.setSettingInVSConfig('enabledLanguageIds', langs, useGlobal).then(() => langs);
}
exports.disableLanguageIdInConfig = disableLanguageIdInConfig;
/**
 * @description Enable a programming language
 * @param isGlobal - true: User settings, false: workspace settings
 * @param languageId
 */
function enableLanguage(isGlobal, languageId) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    return enableLanguageIdInConfig(useGlobal, languageId).then(() => {
        if (!useGlobal) {
            findSettingsFileLocation()
                .then(settingsFilename => settingsFilename && CSpellSettings.writeAddLanguageIdsToSettings(settingsFilename, [languageId], true))
                .then(() => { });
        }
    });
}
exports.enableLanguage = enableLanguage;
function disableLanguage(isGlobal, languageId) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    return disableLanguageIdInConfig(useGlobal, languageId).then(() => {
        if (!useGlobal) {
            return findSettingsFileLocation()
                .then(settingsFilename => settingsFilename && CSpellSettings.removeLanguageIdsFromSettingsAndUpdate(settingsFilename, [languageId]))
                .then(() => { });
        }
    });
}
exports.disableLanguage = disableLanguage;
function addWordToSettings(isGlobal, word) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    const section = useGlobal ? 'userWords' : 'words';
    const words = config.getSettingFromVSConfig(section) || [];
    return config.setSettingInVSConfig(section, util_1.unique(words.concat([word]).sort()), useGlobal);
}
exports.addWordToSettings = addWordToSettings;
function toggleEnableSpellChecker() {
    const curr = config.getSettingFromVSConfig('enabled');
    return config.setSettingInVSConfig('enabled', !curr, false);
}
exports.toggleEnableSpellChecker = toggleEnableSpellChecker;
/**
 * Enables the current programming language of the active file in the editor.
 */
function enableCurrentLanguage() {
    const editor = vscode.window && vscode.window.activeTextEditor;
    if (editor && editor.document && editor.document.languageId) {
        return enableLanguage(false, editor.document.languageId);
    }
    return Promise.resolve();
}
exports.enableCurrentLanguage = enableCurrentLanguage;
/**
 * Disables the current programming language of the active file in the editor.
 */
function disableCurrentLanguage() {
    const editor = vscode.window && vscode.window.activeTextEditor;
    if (editor && editor.document && editor.document.languageId) {
        return disableLanguage(false, editor.document.languageId);
    }
    return Promise.resolve();
}
exports.disableCurrentLanguage = disableCurrentLanguage;
function enableLocal(isGlobal, local) {
    const currentLanguage = config.getSettingFromVSConfig('language') || '';
    const languages = currentLanguage.split(',')
        .concat(local.split(','))
        .map(a => a.trim())
        .filter(util_1.uniqueFilter())
        .join(',');
    return config.setSettingInVSConfig('language', languages, isGlobal);
}
exports.enableLocal = enableLocal;
function disableLocal(isGlobal, local) {
    local = server_1.normalizeLocal(local);
    const currentLanguage = config.getSettingFromVSConfig('language') || '';
    const languages = server_1.normalizeLocal(currentLanguage)
        .split(',')
        .filter(lang => lang !== local)
        .join(',');
    return config.setSettingInVSConfig('language', languages, isGlobal);
}
exports.disableLocal = disableLocal;
function updateSettings(isGlobal, settings) {
    const keys = Object.keys(settings);
    return Promise.all(keys.map(key => config.setSettingInVSConfig(key, settings[key], isGlobal)));
}
exports.updateSettings = updateSettings;
//# sourceMappingURL=settings.js.map