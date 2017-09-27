"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const sectionCSpell = 'cSpell';
function getSectionName(subSection) {
    return [sectionCSpell, subSection].filter(a => !!a).join('.');
}
exports.getSectionName = getSectionName;
function getSettingsFromVSConfig() {
    const config = vscode_1.workspace.getConfiguration();
    return config.get(sectionCSpell) || {};
}
exports.getSettingsFromVSConfig = getSettingsFromVSConfig;
function getSettingFromVSConfig(subSection) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.get(section);
}
exports.getSettingFromVSConfig = getSettingFromVSConfig;
function inspectSettingFromVSConfig(subSection) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.inspect(section);
}
exports.inspectSettingFromVSConfig = inspectSettingFromVSConfig;
function setSettingInVSConfig(subSection, value, isGlobal) {
    const section = getSectionName(subSection);
    const config = vscode_1.workspace.getConfiguration();
    return config.update(section, value, isGlobal);
}
exports.setSettingInVSConfig = setSettingInVSConfig;
//# sourceMappingURL=config.js.map