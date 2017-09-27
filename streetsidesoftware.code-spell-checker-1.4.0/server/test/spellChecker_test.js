"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const spellChecker_1 = require("../src/spellChecker");
const spellChecker_2 = require("../src/spellChecker");
const Rx = require("rx");
describe('Verify Contractions', function () {
    it('tests contractions', () => {
        const words = ['apple', 'banana', 'orange', 'pear', 'grape', "doesn't", "can't", "won't"];
        return spellChecker_2.processWordListLines(Rx.Observable.fromArray(words))
            .map(({ setOfWords }) => setOfWords)
            .toPromise()
            .then(wordSet => {
            chai_1.expect(wordSet).to.have.property('apple');
            chai_1.expect(wordSet).to.have.property("doesn't");
            chai_1.expect(wordSet).to.not.have.property('doesn');
        });
    });
});
describe('Verify Spell Checker', function () {
    // this.timeout(10000);
    it('did load', () => {
        return spellChecker_1.isWordInDictionary('yes').then(isFound => {
            chai_1.expect(isFound).to.be.true;
        });
    });
    it('will ignore case.', () => {
        return spellChecker_1.isWordInDictionary('netherlands').then(isFound => {
            chai_1.expect(isFound).to.be.true;
        });
    });
    it("has wasn't", () => {
        return spellChecker_1.isWordInDictionary("wasn't").then(isFound => {
            chai_1.expect(isFound).to.be.true;
        });
    });
    it('Works with Typescript reserved words', () => {
        const reservedWords = ['const', 'stringify', 'constructor', 'delete', 'prototype', 'type'];
        return Rx.Observable.fromArray(reservedWords)
            .flatMap(word => spellChecker_1.isWordInDictionary(word).then(isFound => ({ word, isFound })))
            .tap(wf => chai_1.expect(wf.isFound, 'Expect to be found: ' + wf.word).to.be.true)
            .toArray()
            .toPromise();
    });
});
//# sourceMappingURL=spellChecker_test.js.map