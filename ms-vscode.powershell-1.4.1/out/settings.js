/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
const vscode = require("vscode");
const utils = require("./utils");
var CodeFormattingPreset;
(function (CodeFormattingPreset) {
    CodeFormattingPreset[CodeFormattingPreset["Custom"] = 0] = "Custom";
    CodeFormattingPreset[CodeFormattingPreset["Allman"] = 1] = "Allman";
    CodeFormattingPreset[CodeFormattingPreset["OTBS"] = 2] = "OTBS";
    CodeFormattingPreset[CodeFormattingPreset["Stroustrup"] = 3] = "Stroustrup";
})(CodeFormattingPreset || (CodeFormattingPreset = {}));
function load() {
    let configuration = vscode.workspace.getConfiguration(utils.PowerShellLanguageId);
    let defaultScriptAnalysisSettings = {
        enable: true,
        settingsPath: ""
    };
    let defaultDebuggingSettings = {
        createTemporaryIntegratedConsole: false,
    };
    let defaultDeveloperSettings = {
        featureFlags: [],
        powerShellExePath: undefined,
        bundledModulesPath: undefined,
        editorServicesLogLevel: "Normal",
        editorServicesWaitForDebugger: false,
        powerShellExeIsWindowsDevBuild: false
    };
    let defaultCodeFormattingSettings = {
        preset: CodeFormattingPreset.Custom,
        openBraceOnSameLine: true,
        newLineAfterOpenBrace: true,
        newLineAfterCloseBrace: true,
        whitespaceBeforeOpenBrace: true,
        whitespaceBeforeOpenParen: true,
        whitespaceAroundOperator: true,
        whitespaceAfterSeparator: true,
        ignoreOneLineBlock: true,
        alignPropertyValuePairs: true
    };
    let defaultIntegratedConsoleSettings = {
        showOnStartup: true,
        focusConsoleOnExecute: true
    };
    return {
        startAutomatically: configuration.get("startAutomatically", true),
        powerShellExePath: configuration.get("powerShellExePath", undefined),
        useX86Host: configuration.get("useX86Host", false),
        enableProfileLoading: configuration.get("enableProfileLoading", false),
        scriptAnalysis: configuration.get("scriptAnalysis", defaultScriptAnalysisSettings),
        debugging: configuration.get("debugging", defaultDebuggingSettings),
        developer: configuration.get("developer", defaultDeveloperSettings),
        codeFormatting: configuration.get("codeFormatting", defaultCodeFormattingSettings),
        integratedConsole: configuration.get("integratedConsole", defaultIntegratedConsoleSettings)
    };
}
exports.load = load;
function change(settingName, newValue, global = false) {
    let configuration = vscode.workspace.getConfiguration(utils.PowerShellLanguageId);
    return configuration.update(settingName, newValue, global);
}
exports.change = change;
//# sourceMappingURL=settings.js.map