"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const serverSettings = require("./serverSettings");
describe('Validate Server Settings', () => {
    it('Tests extracting dictionaries by local', () => {
        const langSetting = [
            { local: 'en,en-US', languageId: '*', dictionaries: ['English'] },
            { local: 'en', languageId: '*', dictionaries: ['Misc'] },
            { local: 'fr', languageId: '*', dictionaries: ['French'] },
            { local: '*', languageId: 'java', dictionaries: ['Java'] },
        ];
        const locals = serverSettings.extractDictionariesByLocalLanguageSettings(langSetting);
        chai_1.expect(locals.get('en')).to.be.not.null;
        chai_1.expect(locals.get('en-GB')).to.be.undefined;
        chai_1.expect(locals.get('en-US')).to.be.not.null;
        chai_1.expect(locals.get('fr')).to.be.not.null;
        chai_1.expect(locals.get('*')).to.be.not.null;
        chai_1.expect(locals.get('en')).to.contain('English');
        chai_1.expect(locals.get('en')).to.contain('Misc');
        chai_1.expect(locals.get('en-US')).to.not.contain('Misc');
    });
});
//# sourceMappingURL=serverSettings.test.js.map