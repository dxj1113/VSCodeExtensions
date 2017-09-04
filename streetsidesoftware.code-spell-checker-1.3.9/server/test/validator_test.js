"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Validator = require("../src/validator");
const loremIpsum = require('lorem-ipsum');
describe('Validator', () => {
    it('validates the validator', () => {
        return Validator.validateText('The quick brouwn fox jumpped over the lazzy dog.')
            .map(({ word }) => word)
            .toArray()
            .toPromise()
            .then(results => {
            chai_1.expect(results).to.be.deep.equal(['brouwn', 'jumpped', 'lazzy']);
        });
    });
    it('validate limit', () => {
        return Validator.validateText(loremIpsum({ count: 5, unit: 'paragraphs' }), { maxNumberOfProblems: 10 })
            .toArray()
            .toPromise()
            .then(results => {
            chai_1.expect(results).to.be.lengthOf(10);
        });
    });
    it('validates reserved words', () => {
        return Validator.validateText('constructor const prototype type typeof null undefined', { maxNumberOfProblems: 10 })
            .toArray()
            .toPromise()
            .then(results => {
            chai_1.expect(results).to.be.lengthOf(0);
        });
    });
});
//# sourceMappingURL=validator_test.js.map