"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const text_1 = require("../../src/util/text");
const Text = require("../../src/util/text");
const chai_1 = require("chai");
describe('Util Text', () => {
    it('splits words', () => {
        chai_1.expect(text_1.splitCamelCaseWord('hello')).to.deep.equal(['hello']);
        chai_1.expect(text_1.splitCamelCaseWord('helloThere')).to.deep.equal(['hello', 'There']);
        chai_1.expect(text_1.splitCamelCaseWord('HelloThere')).to.deep.equal(['Hello', 'There']);
        chai_1.expect(text_1.splitCamelCaseWord('BigÁpple')).to.deep.equal(['Big', 'Ápple']);
    });
    it('extract word from text', () => {
        chai_1.expect(Text.extractWordsFromText(`
            // could've, would've, couldn't've, wasn't, y'all, 'twas
        `)).to.deep.equal([
            { word: "could've", offset: 16 },
            { word: "would've", offset: 26 },
            { word: "couldn't've", offset: 36 },
            { word: "wasn't", offset: 49 },
            { word: "y'all", offset: 57 },
            { word: 'twas', offset: 65 },
        ]);
    });
    it('extract words', () => {
        chai_1.expect(Text.extractWordsFromText(`
            expect(splitCamelCaseWord('hello')).to.deep.equal(['hello']);
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'splitCamelCaseWord', offset: 20 },
            { word: 'hello', offset: 40 },
            { word: 'to', offset: 49 },
            { word: 'deep', offset: 52 },
            { word: 'equal', offset: 57 },
            { word: 'hello', offset: 65 },
        ]);
        chai_1.expect(Text.extractWordsFromText(`
            expect(splitCamelCaseWord('hello')).to.deep.equal(['hello']);
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'splitCamelCaseWord', offset: 20 },
            { word: 'hello', offset: 40 },
            { word: 'to', offset: 49 },
            { word: 'deep', offset: 52 },
            { word: 'equal', offset: 57 },
            { word: 'hello', offset: 65 },
        ]);
        chai_1.expect(Text.extractWordsFromText(`
            expect(splitCamelCaseWord('hello'));
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'splitCamelCaseWord', offset: 20 },
            { word: 'hello', offset: 40 },
        ]);
    });
    it('extract words from code', () => {
        chai_1.expect(Text.extractWordsFromCode(`
            expect(splitCamelCaseWord('hello')).to.deep.equal(['hello']);
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'split', offset: 20 },
            { word: 'Camel', offset: 25 },
            { word: 'Case', offset: 30 },
            { word: 'Word', offset: 34 },
            { word: 'hello', offset: 40 },
            { word: 'to', offset: 49 },
            { word: 'deep', offset: 52 },
            { word: 'equal', offset: 57 },
            { word: 'hello', offset: 65 },
        ]);
        chai_1.expect(Text.extractWordsFromCode(`
            expect(regExp.match(first_line));
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'reg', offset: 20 },
            { word: 'Exp', offset: 23 },
            { word: 'match', offset: 27 },
            { word: 'first', offset: 33 },
            { word: 'line', offset: 39 },
        ]);
        chai_1.expect(Text.extractWordsFromCode(`
            expect(aHELLO);
        `)).to.deep.equal([
            { word: 'expect', offset: 13 },
            { word: 'a', offset: 20 },
            { word: 'HELLO', offset: 21 },
        ]);
    });
    it('splits words like HTMLInput', () => {
        return Text.extractWordsFromCodeRx('var value = HTMLInput.value;')
            .map(({ word }) => word)
            .toArray()
            .toPromise()
            .then(words => {
            chai_1.expect(words).to.deep.equal(['var', 'value', 'HTML', 'Input', 'value']);
        });
    });
    it('tests matchCase', () => {
        chai_1.expect(Text.matchCase('Apple', 'orange')).to.be.equal('Orange');
        chai_1.expect(Text.matchCase('apple', 'ORANGE')).to.be.equal('orange');
        chai_1.expect(Text.matchCase('apple', 'orange')).to.be.equal('orange');
        chai_1.expect(Text.matchCase('APPLE', 'orange')).to.be.equal('ORANGE');
        chai_1.expect(Text.matchCase('ApPlE', 'OrangE')).to.be.equal('OrangE');
    });
    it('tests skipping Chinese characters', () => {
        chai_1.expect(Text.extractWordsFromCode(`
            <a href="http://www.ctrip.com" title="携程旅行网">携程旅行网</a>
        `).map(wo => wo.word)).to.deep.equal(['a', 'href', 'http', 'www', 'ctrip', 'com', 'title', 'a']);
    });
    it('tests Greek characters', () => {
        chai_1.expect(Text.extractWordsFromCode(`
            Γ γ	gamma, γάμμα
        `).map(wo => wo.word)).to.deep.equal(['Γ', 'γ', 'gamma', 'γάμμα']);
    });
    it('test case of Chinese characters', () => {
        chai_1.expect(Text.isUpperCase('携程旅行网')).to.be.false;
        chai_1.expect(Text.isLowerCase('携程旅行网')).to.be.false;
    });
});
//# sourceMappingURL=text_test.js.map