"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function extractLanguage(config) {
    return (config &&
        config.language &&
        normalizeLang(config.language)) || undefined;
}
exports.extractLanguage = extractLanguage;
function extractLocals(config) {
    if (!config)
        return [];
    return extractLocalsFromLanguageSettings(config.languageSettings);
}
exports.extractLocals = extractLocals;
function extractLocalsFromLanguageSettings(langSettings) {
    if (!langSettings)
        return [];
    const langs = langSettings
        .map(s => s.local || '')
        .filter(s => !!s)
        .map(s => Array.isArray(s) ? s.join(',') : s)
        .join(',');
    return normalizeLang(langs);
}
exports.extractLocalsFromLanguageSettings = extractLocalsFromLanguageSettings;
function normalizeLang(lang) {
    return lang
        .replace(/[|]/g, ',')
        .replace(/[\s*]/g, '')
        .replace(/[_]/g, '-')
        .split(',');
}
//# sourceMappingURL=serverSettings.js.map