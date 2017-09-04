"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimatch = require('minimatch');
const path = require("path");
function extractGlobsFromExcludeFilesGlobMap(globMap) {
    const globs = Object.getOwnPropertyNames(globMap)
        .filter(glob => globMap[glob]);
    return globs;
}
exports.extractGlobsFromExcludeFilesGlobMap = extractGlobsFromExcludeFilesGlobMap;
function generateExclusionFunction(globs, root) {
    const fns = globs.map(glob => minimatch.filter(glob, { matchBase: true }));
    function testPath(path) {
        return fns.reduce((prev, fn) => prev || fn(path), false);
    }
    function recursiveMatch(fullPath) {
        // do not match against the root.
        if (fullPath === root) {
            return false;
        }
        const baseDir = path.dirname(fullPath);
        if (baseDir === fullPath) {
            return testPath(fullPath);
        }
        return recursiveMatch(baseDir) || testPath(fullPath);
    }
    return (filename) => recursiveMatch(filename);
}
exports.generateExclusionFunction = generateExclusionFunction;
//# sourceMappingURL=exclusionHelper.js.map