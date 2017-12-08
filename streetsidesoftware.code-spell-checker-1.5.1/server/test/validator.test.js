"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Validator = require("../src/validator");
const loremIpsum = require('lorem-ipsum');
const tds = require("cspell");
const cspell_1 = require("cspell");
// cSpell:ignore brouwn jumpped lazzy wrongg mispelled ctrip nmove mischecked
const defaultSettings = Object.assign({}, cspell_1.getDefaultSettings(), { enabledLanguageIds: ['plaintext', 'javascript'] });
function getSettings(text, languageId) {
    return tds.constructSettingsForText(defaultSettings, text, languageId);
}
describe('Validator', function () {
    this.timeout(5000);
    it('validates the validator', () => {
        const text = 'The quick brouwn fox jumpped over the lazzy dog.';
        const languageId = 'plaintext';
        const settings = getSettings(text, languageId);
        const results = Validator.validateText(text, settings);
        return results.then(results => {
            const words = results.map(({ text }) => text);
            chai_1.expect(words).to.be.deep.equal(['brouwn', 'jumpped', 'lazzy']);
        });
    });
    it('validates ignore Case', () => {
        const text = 'The Quick brown fox Jumped over the lazy dog.';
        const languageId = 'plaintext';
        const settings = getSettings(text, languageId);
        const results = Validator.validateText(text, settings);
        return results.then(results => {
            const words = results.map(({ text }) => text);
            chai_1.expect(words).to.be.deep.equal([]);
        });
    });
    it('validate limit', () => {
        const text = loremIpsum({ count: 5, unit: 'paragraphs' });
        const languageId = 'plaintext';
        const settings = Object.assign({}, getSettings(text, languageId), { maxNumberOfProblems: 10 });
        const results = Validator.validateText(text, settings);
        return results.then(results => chai_1.expect(results).to.be.lengthOf(10));
    });
    it('validates reserved words', () => {
        const text = 'constructor const prototype type typeof null undefined';
        const languageId = 'javascript';
        const settings = Object.assign({}, getSettings(text, languageId), { maxNumberOfProblems: 10 });
        const results = Validator.validateText(text, settings);
        return results.then(results => chai_1.expect(results).to.be.lengthOf(0));
    });
    it('validates regex inclusions/exclusions', () => {
        const text = sampleCode;
        const languageId = 'plaintext';
        const settings = Object.assign({}, getSettings(text, languageId), { maxNumberOfProblems: 10 });
        const results = Validator.validateText(text, settings);
        return results.then(results => {
            const words = results.map(wo => wo.text);
            chai_1.expect(words).to.contain('wrongg');
            chai_1.expect(words).to.contain('mispelled');
            chai_1.expect(words).to.not.contain('xaccd');
            chai_1.expect(words).to.not.contain('ctrip');
            chai_1.expect(words).to.not.contain('FFEE');
            chai_1.expect(words).to.not.contain('nmove');
        });
    });
    it('validates ignoreRegExpList', () => {
        const text = sampleCode;
        const languageId = 'plaintext';
        const settings = Object.assign({}, getSettings(text, languageId), { maxNumberOfProblems: 10, ignoreRegExpList: ['^const [wy]RON[g]+', 'mis.*led'] });
        const results = Validator.validateText(text, settings);
        return results.then(results => {
            const words = results.map(wo => wo.text);
            chai_1.expect(words).to.not.contain('wrongg');
            chai_1.expect(words).to.not.contain('mispelled');
            chai_1.expect(words).to.contain('mischecked');
        });
    });
    it('validates ignoreRegExpList 2', () => {
        const results = Validator.validateText(sampleCode, { ignoreRegExpList: ['/^const [wy]ron[g]+/gim', '/MIS...LED/g', '/mischecked'] });
        return results.then(results => {
            const words = results.map(wo => wo.text);
            chai_1.expect(words).to.not.contain('wrongg');
            chai_1.expect(words).to.contain('mispelled');
            chai_1.expect(words).to.contain('mischecked');
        });
    });
    it('validates malformed ignoreRegExpList', () => {
        const results = Validator.validateText(sampleCode, { ignoreRegExpList: ['/wrong[/gim', 'mis.*led'] });
        return results.then(results => {
            const words = results.map(wo => wo.text);
            chai_1.expect(words).to.contain('wrongg');
            chai_1.expect(words).to.not.contain('mispelled');
            chai_1.expect(words).to.contain('mischecked');
        });
    });
});
const sampleCode = `

// Verify urls do not get checked.
const url = 'http://ctrip.com?q=words';

// Verify hex values.
const value = 0xaccd;

/* spell-checker:disable */

const weirdWords = ['ctrip', 'xebia', 'zando', 'zooloo'];

/* spell-checker:enable */

const wrongg = 'mispelled';
const check = 'mischecked';
const message = "\\nmove to next line";

const hex = 0xBADC0FFEE;

`;
//# sourceMappingURL=validator.test.js.map