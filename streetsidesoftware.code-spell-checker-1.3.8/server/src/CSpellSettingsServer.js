"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const tsmerge_1 = require("tsmerge");
const json = require("comment-json");
const currentSettingsFileVersion = '0.1';
exports.sectionCSpell = 'cSpell';
exports.defaultFileName = 'cSpell.json';
const defaultSettings = {
    version: currentSettingsFileVersion,
    language: 'en',
    words: ['wasn'],
    flagWords: ['hte'],
    ignorePaths: ['./node_modules', './typings'],
};
function readSettings(filename) {
    const settings = readJsonFile(filename);
    function readJsonFile(file) {
        try {
            return json.parse(fs.readFileSync(file).toString());
        }
        catch (err) {
        }
        return defaultSettings;
    }
    return tsmerge_1.merge(defaultSettings, settings);
}
exports.readSettings = readSettings;
//# sourceMappingURL=CSpellSettingsServer.js.map