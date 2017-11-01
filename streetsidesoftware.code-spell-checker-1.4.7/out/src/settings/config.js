"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const sectionCSpell = 'cSpell';
let config = inspectConfig();
vscode_1.workspace.onDidChangeConfiguration(() => {
    config = inspectConfig();
});
function getSectionName(subSection) {
    return [sectionCSpell, subSection].filter(a => !!a).join('.');
}
exports.getSectionName = getSectionName;
function getSettingsFromVSConfig() {
    const config = vscode_1.workspace.getConfiguration();
    return config.get(sectionCSpell) || {};
}
exports.getSettingsFromVSConfig = getSettingsFromVSConfig;
function getSettingFromVSConfig(subSection, source) {
    if (!source || source == 'value') {
        const section = getSectionName(subSection);
        const config = vscode_1.workspace.getConfiguration();
        return config.get(section);
    }
    const ins = inspectSettingFromVSConfig(subSection);
    return ins && ins[source];
}
exports.getSettingFromVSConfig = getSettingFromVSConfig;
function inspectSettingFromVSConfig(subSection) {
    const { defaultValue = {}, globalValue = {}, workspaceValue = {}, workspaceFolderValue = {} } = config;
    return {
        key: config.key + '.' + subSection,
        defaultValue: defaultValue[subSection],
        globalValue: globalValue[subSection],
        workspaceValue: workspaceValue[subSection],
        workspaceFolderValue: workspaceFolderValue[subSection],
    };
}
exports.inspectSettingFromVSConfig = inspectSettingFromVSConfig;
function setSettingInVSConfig(subSection, value, isGlobal) {
    shadowSetSetting(subSection, value, isGlobal);
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.update(section, value, isGlobal);
}
exports.setSettingInVSConfig = setSettingInVSConfig;
function shadowSetSetting(subSection, value, isGlobal) {
    const scope = isGlobal ? 'globalValue' : 'workspaceValue';
    const curr = config[scope] || {};
    config[scope] = Object.assign({}, curr, { [subSection]: value });
    return config[scope];
}
function inspectConfig() {
    return vscode_1.workspace.getConfiguration().inspect(sectionCSpell) || { key: '' };
}
exports.inspectConfig = inspectConfig;
//# sourceMappingURL=config.js.map