"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const CSpellSettings = require("./CSpellSettings");
const vscode_1 = require("vscode");
const path = require("path");
const vscode_2 = require("vscode");
const vscode = require("vscode");
const util_1 = require("../util");
const watcher = require("../util/watcher");
const config = require("./config");
const Rx = require("rxjs/Rx");
const fs = require("fs-extra");
exports.baseConfigName = CSpellSettings.defaultFileName;
exports.configFileLocations = [
    exports.baseConfigName,
    exports.baseConfigName.toLowerCase(),
    `.vscode/${exports.baseConfigName}`,
    `.vscode/${exports.baseConfigName.toLowerCase()}`,
];
exports.findConfig = `.vscode/{${exports.baseConfigName},${exports.baseConfigName.toLowerCase()}}`;
function watchSettingsFiles(callback) {
    // Every 10 seconds see if we have new files to watch.
    const d = Rx.Observable.interval(10000)
        .flatMap(findSettingsFiles)
        .flatMap(a => a)
        .map(uri => uri.fsPath)
        .filter(file => !watcher.isWatching(file))
        .subscribe(file => watcher.add(file, callback));
    return vscode.Disposable.from({ dispose: () => {
            watcher.dispose();
            d.unsubscribe();
        } });
}
exports.watchSettingsFiles = watchSettingsFiles;
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
    const { rootPath } = vscode_1.workspace;
    if (rootPath === undefined) {
        return Promise.resolve([]);
    }
    const found = exports.configFileLocations
        .map(rel => path.join(rootPath, rel))
        .map(filename => fs.pathExists(filename)
        .then(exists => ({ filename, exists })));
    return Promise.all(found).then(found => found
        .filter(found => found.exists)
        .map(found => found.filename)
        .map(filename => vscode_2.Uri.file(filename)));
}
exports.findSettingsFiles = findSettingsFiles;
function findExistingSettingsFileLocation() {
    return findSettingsFiles()
        .then(uris => uris.map(uri => uri.fsPath))
        .then(paths => paths.sort((a, b) => a.length - b.length))
        .then(paths => paths[0]);
}
exports.findExistingSettingsFileLocation = findExistingSettingsFileLocation;
function findSettingsFileLocation() {
    return findExistingSettingsFileLocation()
        .then(path => path || getDefaultWorkspaceConfigLocation());
}
exports.findSettingsFileLocation = findSettingsFileLocation;
function loadTheSettingsFile() {
    return findSettingsFileLocation()
        .then(loadSettingsFile);
}
exports.loadTheSettingsFile = loadTheSettingsFile;
function loadSettingsFile(path) {
    return path
        ? CSpellSettings.readSettings(path).then(settings => (path ? { path, settings } : undefined))
        : Promise.resolve(undefined);
}
exports.loadSettingsFile = loadSettingsFile;
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
            findExistingSettingsFileLocation()
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
            return findExistingSettingsFileLocation()
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
    return config.setSettingInVSConfig(section, util_1.unique(words.concat(word.split(' ')).sort()), useGlobal);
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
    const currentLanguage = config.getSettingFromVSConfig('language', isGlobal ? 'globalValue' : 'workspaceValue') || '';
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
    const currentLanguage = config.getSettingFromVSConfig('language', isGlobal ? 'globalValue' : 'workspaceValue') || '';
    const languages = server_1.normalizeLocal(currentLanguage)
        .split(',')
        .filter(lang => lang !== local)
        .join(',') || undefined;
    return config.setSettingInVSConfig('language', languages, isGlobal);
}
exports.disableLocal = disableLocal;
function overrideLocal(enable, isGlobal) {
    const inspectLang = config.inspectSettingFromVSConfig('language');
    const lang = enable && inspectLang
        ? (isGlobal ? inspectLang.defaultValue : inspectLang.globalValue || inspectLang.defaultValue)
        : undefined;
    return config.setSettingInVSConfig('language', lang, isGlobal);
}
exports.overrideLocal = overrideLocal;
function updateSettings(isGlobal, settings) {
    const keys = Object.keys(settings);
    return Promise.all(keys.map(key => config.setSettingInVSConfig(key, settings[key], isGlobal)));
}
exports.updateSettings = updateSettings;
//# sourceMappingURL=settings.js.map