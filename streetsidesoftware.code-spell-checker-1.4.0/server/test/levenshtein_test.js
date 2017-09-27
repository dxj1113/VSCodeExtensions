"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const levenshtein_1 = require("../src/levenshtein");
describe('validate Levenshtein', () => {
    it('tests running vs raining', () => {
        const sMatrix = levenshtein_1.calcLevenshteinMatrixAsText('running', 'raining');
        console.log(sMatrix);
    });
    it('tests aaaaa vs aaaa', () => {
        const sMatrix = levenshtein_1.calcLevenshteinMatrixAsText('aaaxyzaa', 'xyzaa');
        console.log(sMatrix);
    });
});
//# sourceMappingURL=levenshtein_test.js.map