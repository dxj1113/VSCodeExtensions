// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const source_map_1 = require("source-map");
const sourceMapResolve = require("source-map-resolve");
class SourceMapsCombinator {
    convert(rawBundleSourcemap) {
        // Find user files from bundle files list
        const consumers = rawBundleSourcemap.sources
            .reduce((result, file) => {
            // Skip files inside node_modules
            if (file.indexOf("node_modules") >= 0)
                return result;
            try {
                let consumer = this.getSourceMapConsumerFrom(file);
                if (consumer)
                    result[file] = consumer;
            }
            finally {
                return result;
            }
        }, {});
        if (Object.keys(consumers).length === 0) {
            // Sourcemaps not found, so return original bundle sourcemap
            return rawBundleSourcemap;
        }
        const generator = new source_map_1.SourceMapGenerator();
        const bundleConsumer = new source_map_1.SourceMapConsumer(rawBundleSourcemap);
        bundleConsumer.eachMapping((item) => {
            if (item.source === null) {
                // Some mappings in react native bundle have no sources
                return;
            }
            // Copy mappings
            let mapping = {
                generated: { line: item.generatedLine, column: item.generatedColumn },
                original: { line: item.originalLine, column: item.originalColumn },
                source: item.source,
                name: item.name,
            };
            if (consumers[item.source]) {
                let jsPosition = { line: item.originalLine, column: item.originalColumn };
                let tsPosition = consumers[item.source].originalPositionFor(jsPosition);
                if (tsPosition.source === null) {
                    // Some positions from react native generated bundle can not translate to TS source positions
                    // skip them
                    return;
                }
                // Resolve TS source path to absolute because it might be relative to generated JS
                // (this depends on whether "sourceRoot" option is specified in tsconfig.json)
                tsPosition.source = path.resolve(rawBundleSourcemap.sourceRoot, path.dirname(item.source), tsPosition.source);
                // Update mapping w/ mapped position values
                mapping = Object.assign({}, mapping, tsPosition, { original: { line: tsPosition.line, column: tsPosition.column } });
            }
            try {
                generator.addMapping(mapping);
            }
            catch (err) {
            }
        });
        return generator.toJSON();
    }
    getSourceMapConsumerFrom(generatedFile) {
        let code = fs.readFileSync(generatedFile);
        let consumer = this.readSourcemap(generatedFile, code.toString());
        return consumer;
    }
    readSourcemap(file, code) {
        let result = sourceMapResolve.resolveSync(code, file, fs.readFileSync);
        if (result === null) {
            return null;
        }
        return new source_map_1.SourceMapConsumer(result.map);
    }
}
exports.SourceMapsCombinator = SourceMapsCombinator;

//# sourceMappingURL=sourceMapsCombinator.js.map
