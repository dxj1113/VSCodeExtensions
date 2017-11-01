"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const t = require("./pugCSpellInfo");
const path = require("path");
const fs = require("fs-extra");
const imagesPath = getPathToImages();
function genSetLocal(code, enabled, isGlobal) {
    return `command:SetLocal?${JSON.stringify([code, enabled, isGlobal])}`;
}
function genOverrideLocal(enable, isGlobal) {
    return `command:overrideLocalSetting?${JSON.stringify([enable, isGlobal])}`;
}
const localInfo = [
    {
        code: 'en',
        name: 'English',
        enabled: true,
        isInUserSettings: true,
        isInWorkspaceSettings: undefined,
        dictionaries: ['English', 'Misc'],
    },
    {
        code: 'en-US',
        name: 'English, United States',
        enabled: true,
        isInUserSettings: true,
        isInWorkspaceSettings: undefined,
        dictionaries: ['English'],
    },
    {
        code: 'es',
        name: 'Spanish',
        enabled: true,
        isInUserSettings: false,
        isInWorkspaceSettings: undefined,
        dictionaries: ['Spanish'],
    },
];
const dictionaries = [
    { name: 'cpp', description: 'C & CPP Keywords and Function names.' },
    { name: 'en-es', description: 'Spanish Dictionary (Spain)' },
    { name: 'en-us', description: 'American English Dictionary' },
    { name: 'php', description: 'PHP Keywords and Function names.' },
    { name: 'html', description: 'HTML Keywords' },
    { name: 'typescript', description: 'TypeScript Keywords and Function names.' },
];
const dictionariesForFile = ['en-us', 'html', 'typescript'];
const dictionariesInUse = new Set(dictionariesForFile);
const isDictionaryInUse = dict => dictionariesInUse.has(dict);
const local = {
    default: 'en',
    user: 'en,de',
    workspace: undefined
};
const info = {
    useDarkTheme: true,
    filename: 'test.ts',
    fileEnabled: true,
    dictionariesForFile,
    isDictionaryInUse,
    dictionaries,
    languageEnabled: true,
    languageId: 'typescript',
    spellingErrors: [['one', 1], ['two', 2], ['three', 3],],
    linkEnableDisableLanguage: 'command:cSpell',
    linkEnableLanguage: 'command:cSpell',
    linkDisableLanguage: 'command:cSpell',
    imagesPath,
    localInfo,
    local,
    availableLocals: ['English'],
    genSetLocal,
    genSelectInfoTabLink,
    genOverrideLocal,
    activeTab: 'FileInfo',
};
describe('Verify Template Renders', () => {
    it('Renders the template to html', () => __awaiter(this, void 0, void 0, function* () {
        const html = t.render(info);
        chai_1.expect(html).to.not.be.empty;
        chai_1.expect(html).to.contain('test.ts');
        chai_1.expect(html).to.contain('<li>two (2)</li>');
        chai_1.expect(html).to.contain(imagesPath);
    }));
    it('Renders the template to html again', () => __awaiter(this, void 0, void 0, function* () {
        const html = t.render({
            useDarkTheme: true,
            filename: 'main.cpp',
            fileEnabled: true,
            dictionariesForFile,
            isDictionaryInUse,
            dictionaries,
            languageEnabled: true,
            languageId: 'cpp',
            spellingErrors: [['one', 1], ['two', 2], ['three', 3], ['<code>', 5]],
            linkEnableDisableLanguage: 'command:cSpell',
            linkEnableLanguage: 'command:cSpell',
            linkDisableLanguage: 'command:cSpell',
            imagesPath,
            localInfo,
            local,
            availableLocals: ['English'],
            genSetLocal,
            genSelectInfoTabLink,
            genOverrideLocal,
            activeTab: 'FileInfo',
        });
        chai_1.expect(html).to.not.be.empty;
        chai_1.expect(html).to.contain('main.cpp');
        chai_1.expect(html).to.not.contain('<code>');
        chai_1.expect(html).to.contain('&lt;code&gt;');
        const indexFile = getPathToTemp('index.html');
        yield fs.mkdirp(path.dirname(indexFile));
        yield fs.writeFile(indexFile, html);
    }));
});
function getPathToTemp(baseFilename) {
    return path.join(__dirname, '..', '..', 'temp', baseFilename);
}
function getPathToImages() {
    return path.join(__dirname, '..', '..', 'images');
}
function genSelectInfoTabLink(tab) {
    return '#' + tab;
}
//# sourceMappingURL=pugCSpellInfo.test.js.map