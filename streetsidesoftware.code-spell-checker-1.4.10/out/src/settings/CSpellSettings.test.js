"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const CSpellSettings_1 = require("./CSpellSettings");
const CSS = require("./CSpellSettings");
const util_1 = require("../util");
describe('Validate CSpellSettings functions', () => {
    const filenameSampleCSpellFile = getPathToSample('cSpell.json');
    it('tests reading a settings file', () => {
        return CSpellSettings_1.readSettings(filenameSampleCSpellFile).then((settings => {
            chai_1.expect(settings).to.not.be.empty;
            chai_1.expect(settings.enabled).to.be.undefined;
            chai_1.expect(settings.enabledLanguageIds).to.be.undefined;
        }));
    });
    it('tests writing a file', () => {
        const filename = getPathToTemp('tempCSpell.json');
        return CSpellSettings_1.readSettings(filenameSampleCSpellFile)
            .then(settings => {
            settings.enabled = false;
            return CSpellSettings_1.updateSettings(filename, settings)
                .then(() => CSpellSettings_1.readSettings(filename))
                .then(writtenSettings => {
                chai_1.expect(writtenSettings).to.be.deep.equal(settings);
            });
        });
    });
    it('Validate default settings', () => {
        const defaultSetting = CSS.getDefaultSettings();
        chai_1.expect(defaultSetting.words).to.be.length(0);
        chai_1.expect(defaultSetting.version).to.be.equal('0.1');
    });
    it('tests adding words', () => {
        const words = ['test', 'case', 'case'];
        const defaultSettings = CSS.getDefaultSettings();
        Object.freeze(defaultSettings);
        const newSettings = CSS.addWordsToSettings(defaultSettings, words);
        chai_1.expect(newSettings).to.not.be.equal(defaultSettings);
        chai_1.expect(newSettings.words).to.not.be.empty;
        chai_1.expect(newSettings.words.sort()).to.be.deep.equal(util_1.unique(words).sort());
    });
    it('tests adding languageIds', () => {
        const ids = ['cpp', 'cs', 'php', 'json', 'cs'];
        const defaultSettings = CSS.getDefaultSettings();
        Object.freeze(defaultSettings);
        chai_1.expect(defaultSettings.enabledLanguageIds).to.be.undefined;
        const s1 = CSS.addLanguageIdsToSettings(defaultSettings, ids, true);
        chai_1.expect(s1.enabledLanguageIds).to.be.undefined;
        const s2 = CSS.addLanguageIdsToSettings(defaultSettings, ids, false);
        chai_1.expect(s2.enabledLanguageIds).to.not.be.empty;
        chai_1.expect(s2.enabledLanguageIds.sort()).to.be.deep.equal(util_1.unique(ids).sort());
    });
    it('tests removing languageIds', () => {
        const ids = ['cpp', 'cs', 'php', 'json', 'cs'];
        const toRemove = ['cs', 'php', 'php'];
        const expected = ['cpp', 'json'];
        const defaultSettings = CSS.getDefaultSettings();
        Object.freeze(defaultSettings);
        chai_1.expect(defaultSettings.enabledLanguageIds).to.be.undefined;
        const s2 = CSS.addLanguageIdsToSettings(defaultSettings, ids, false);
        Object.freeze(s2);
        chai_1.expect(s2.enabledLanguageIds).to.not.be.empty;
        chai_1.expect(s2.enabledLanguageIds.sort()).to.be.deep.equal(util_1.unique(ids).sort());
        const s3 = CSS.removeLanguageIdsFromSettings(s2, toRemove);
        chai_1.expect(s3.enabledLanguageIds).to.not.be.empty;
        chai_1.expect(s3.enabledLanguageIds.sort()).to.be.deep.equal(expected);
        const s4 = CSS.removeLanguageIdsFromSettings(defaultSettings, toRemove);
        chai_1.expect(s4.enabledLanguageIds).to.be.undefined;
        const s5 = CSS.removeLanguageIdsFromSettings(s2, ids);
        chai_1.expect(s5.enabledLanguageIds).to.be.undefined;
    });
});
function getPathToSample(baseFilename) {
    return path.join(__dirname, '..', '..', 'samples', baseFilename);
}
function getPathToTemp(baseFilename) {
    return path.join(__dirname, '..', '..', 'temp', baseFilename);
}
//# sourceMappingURL=CSpellSettings.test.js.map