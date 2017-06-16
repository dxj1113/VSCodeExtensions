"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CSpellSettings = require("./CSpellSettings");
const vscode_1 = require("vscode");
const path = require("path");
const util_1 = require("./util");
exports.baseConfigName = CSpellSettings.defaultFileName;
exports.configFileWatcherGlob = `**/{${exports.baseConfigName},${exports.baseConfigName.toLowerCase()}}`;
// This are in preferred order.
const possibleConfigPaths = [
    exports.baseConfigName,
    exports.baseConfigName.toLowerCase(),
    path.join('.vscode', exports.baseConfigName),
    path.join('.vscode', exports.baseConfigName.toLowerCase()),
].join(',');
const sectionCSpell = 'cSpell';
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
function getSectionName(subSection) {
    return [sectionCSpell, subSection].filter(a => !!a).join('.');
}
exports.getSectionName = getSectionName;
function getSettingsFromConfig() {
    const config = vscode_1.workspace.getConfiguration();
    return config.get(sectionCSpell) || {};
}
exports.getSettingsFromConfig = getSettingsFromConfig;
function getSettingFromConfig(subSection) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.get(section);
}
exports.getSettingFromConfig = getSettingFromConfig;
function inspectSettingFromConfig(subSection) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.inspect(section);
}
exports.inspectSettingFromConfig = inspectSettingFromConfig;
function setCSpellConfigSetting(subSection, value, isGlobal) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.update(section, value, isGlobal);
}
exports.setCSpellConfigSetting = setCSpellConfigSetting;
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
            const { language = defaultSettings.language } = getSettingsFromConfig();
            const settings = Object.assign({}, defaultSettings, { language });
            const path = getDefaultWorkspaceConfigLocation();
            return { path, settings };
        }
        return info;
    });
}
exports.getSettings = getSettings;
function setEnableSpellChecking(enabled, isGlobal) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    return setCSpellConfigSetting('enabled', enabled, useGlobal);
}
exports.setEnableSpellChecking = setEnableSpellChecking;
function getEnabledLanguagesFromAllConfigs() {
    const inspect = inspectSettingFromConfig('enabledLanguageIds');
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
    return setCSpellConfigSetting('enabledLanguageIds', langs, useGlobal).then(() => langs);
}
function disableLanguageIdInConfig(isGlobal, languageId) {
    const useGlobal = isGlobal || !hasWorkspaceLocation();
    const langs = getEnabledLanguagesFromConfig(useGlobal).filter(a => a !== languageId).sort();
    return setCSpellConfigSetting('enabledLanguageIds', langs, useGlobal).then(() => langs);
}
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
    const words = getSettingFromConfig(section) || [];
    return setCSpellConfigSetting(section, util_1.unique(words.concat([word])), useGlobal);
}
exports.addWordToSettings = addWordToSettings;
//# sourceMappingURL=settings.js.map