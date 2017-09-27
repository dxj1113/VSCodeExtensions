"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const exclusionHelper_1 = require("../src/exclusionHelper");
const minimatch = require('minimatch');
describe('Verify Exclusion Helper functions', function () {
    it('checks extractGlobsFromExcludeFilesGlobMap', function () {
        const excludeDef = {
            '**/node_modules': true,
            '**/typings': true,
        };
        chai_1.expect(exclusionHelper_1.extractGlobsFromExcludeFilesGlobMap(excludeDef), 'get list of globs').is.deep.equal(['**/node_modules', '**/typings']);
    });
    it('Test the generated matching function', function () {
        const globs = [
            '**/node_modules',
            '**/typings',
            '.vscode',
        ];
        const filesMatching = [
            '~/project/myProject/node_modules',
            '~/project/myProject/node_modules/test/test.js',
            '~/project/myProject/.vscode/cSpell.json',
        ];
        const fn = exclusionHelper_1.generateExclusionFunction(globs, '~/project/myProject');
        filesMatching.forEach(filepath => {
            const r = fn(filepath);
            chai_1.expect(r).to.be.true;
        });
    });
    it('Test against generated files', function () {
        const globs = [
            'debug:/**',
            '**/*.rendered',
        ];
        const files = [
            'debug://internal/1014/extHostCommands.ts',
            '~/project/myProject/README.md.rendered',
        ];
        const fn = exclusionHelper_1.generateExclusionFunction(globs, '~/project/myProject');
        files.forEach(filepath => {
            const r = fn(filepath);
            chai_1.expect(r).to.be.true;
        });
    });
});
//# sourceMappingURL=exclusionHelper_test.js.map