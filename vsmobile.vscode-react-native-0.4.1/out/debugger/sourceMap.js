// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const path = require("path");
const sourceMapsCombinator_1 = require("./sourceMapsCombinator");
const IS_REMOTE = /^[a-zA-z]{2,}:\/\//; // Detection remote sources or specific protocols (like "webpack:///")
class SourceMapUtil {
    /**
     * Given a script body and URL, this method parses the body and finds the corresponding source map URL.
     * If the source map URL is not found in the body in the expected form, null is returned.
     */
    getSourceMapURL(scriptUrl, scriptBody) {
        let result = null;
        // scriptUrl = "http://localhost:8081/index.ios.bundle?platform=ios&dev=true"
        let sourceMappingRelativeUrl = this.getSourceMapRelativeUrl(scriptBody); // sourceMappingRelativeUrl = "/index.ios.map?platform=ios&dev=true"
        if (sourceMappingRelativeUrl) {
            let sourceMappingUrl = url.parse(sourceMappingRelativeUrl);
            sourceMappingUrl.protocol = scriptUrl.protocol;
            sourceMappingUrl.host = scriptUrl.host;
            // parse() repopulates all the properties of the URL
            result = url.parse(url.format(sourceMappingUrl));
        }
        return result;
    }
    /**
     * Updates the contents of a source map file to be VS Code friendly:
     * - makes source paths unix style and relative to the sources root path
     * - updates the url of the script file
     * - deletes the script content from the source map
     *
     * @parameter sourceMapBody - body of the source map as generated by the RN Packager.
     * @parameter scriptPath - path of the script file asssociated with this source map.
     * @parameter sourcesRootPath - root path of sources
     *
     */
    updateSourceMapFile(sourceMapBody, scriptPath, sourcesRootPath) {
        try {
            let sourceMap = JSON.parse(sourceMapBody);
            if (sourceMap.sections) {
                // TODO: there is a need to handle value.map == null, make a fake map
                sourceMap.sections = sourceMap.sections.filter((value, index, array) => {
                    return value.map != null;
                });
                sourceMap = require("flatten-source-map")(sourceMap);
            }
            let sourceMapsCombinator = new sourceMapsCombinator_1.SourceMapsCombinator();
            sourceMap = sourceMapsCombinator.convert(sourceMap);
            if (sourceMap.sources) {
                sourceMap.sources = sourceMap.sources.map(sourcePath => {
                    return IS_REMOTE.test(sourcePath) ? sourcePath : this.updateSourceMapPath(sourcePath, sourcesRootPath);
                });
            }
            delete sourceMap.sourcesContent;
            sourceMap.sourceRoot = "";
            sourceMap.file = scriptPath;
            return JSON.stringify(sourceMap);
        }
        catch (exception) {
            return sourceMapBody;
        }
    }
    /**
     * Updates source map URLs in the script body.
     */
    updateScriptPaths(scriptBody, sourceMappingUrl) {
        // Update the body with the new location of the source map on storage.
        return scriptBody.replace(SourceMapUtil.SourceMapURLRegex, "//# sourceMappingURL=" + path.basename(sourceMappingUrl.pathname));
    }
    /**
     * Given an absolute source path, this method does two things:
     * 1. It changes the path from absolute to be relative to the sourcesRootPath parameter.
     * 2. It changes the path separators to Unix style.
     */
    updateSourceMapPath(sourcePath, sourcesRootPath) {
        let relativeSourcePath = path.relative(sourcesRootPath, sourcePath);
        return this.makeUnixStylePath(relativeSourcePath);
    }
    /**
     * Visual Studio Code source mapping requires Unix style path separators.
     * This method replaces all back-slash characters in a given string with forward-slash ones.
     */
    makeUnixStylePath(p) {
        let pathArgs = p.split(path.sep);
        return path.posix.join.apply(null, pathArgs);
    }
    /**
     * Parses the body of a script searching for a source map URL.
     * It supports the following source map url styles:
     *  //# sourceMappingURL=path/to/source/map
     *  //@ sourceMappingURL=path/to/source/map
     *
     * Returns the first match if found, null otherwise.
     */
    getSourceMapRelativeUrl(body) {
        let match = body.match(SourceMapUtil.SourceMapURLRegex);
        // If match is null, the body doesn't contain the source map
        return match ? match[2] : null;
    }
}
SourceMapUtil.SourceMapURLRegex = /\/\/(#|@) sourceMappingURL=((?!data:).+?)\s*$/m;
exports.SourceMapUtil = SourceMapUtil;

//# sourceMappingURL=sourceMap.js.map