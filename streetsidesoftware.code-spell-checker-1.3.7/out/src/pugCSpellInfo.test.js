"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const t = require("./pugCSpellInfo");
const imagesPath = __dirname;
describe('Verify Template Renders', () => {
    it('Renders the template to html', () => {
        const html = t.render({
            filename: 'test.ts',
            fileEnabled: true,
            languageEnabled: true,
            languageId: 'typescript',
            spellingErrors: [['one', 1], ['two', 2], ['three', 3],],
            linkEnableDisableLanguage: 'command:cSpell',
            linkEnableLanguage: 'command:cSpell',
            linkDisableLanguage: 'command:cSpell',
            imagesPath,
        });
        chai_1.expect(html).to.not.be.empty;
        chai_1.expect(html).to.contain('test.ts');
        chai_1.expect(html).to.contain('<li>two (2)</li>');
        chai_1.expect(html).to.contain(imagesPath);
    });
    it('Renders the template to html again', () => {
        const html = t.render({
            filename: 'main.cpp',
            fileEnabled: true,
            languageEnabled: true,
            languageId: 'cpp',
            spellingErrors: [['one', 1], ['two', 2], ['three', 3], ['<code>', 5]],
            linkEnableDisableLanguage: 'command:cSpell',
            linkEnableLanguage: 'command:cSpell',
            linkDisableLanguage: 'command:cSpell',
            imagesPath,
        });
        chai_1.expect(html).to.not.be.empty;
        chai_1.expect(html).to.contain('main.cpp');
        chai_1.expect(html).to.not.contain('<code>');
        chai_1.expect(html).to.contain('&lt;code&gt;');
    });
});
//# sourceMappingURL=pugCSpellInfo.test.js.map