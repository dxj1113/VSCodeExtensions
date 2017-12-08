"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const latex_1 = require("./latex");
const fs_1 = require("fs");
const outputDir = 'snippets';
fs_1.exists(outputDir, (doesExist) => {
    if (!doesExist) {
        fs_1.mkdirSync(outputDir);
    }
});
let snippets = {};
Object.keys(latex_1.latexSymbols).forEach((tex, ind) => {
    const unicode = latex_1.latexSymbols[tex];
    snippets[unicode] = {
        "body": unicode,
        "prefix": tex
    };
});
const out = JSON.stringify(snippets, null, 4);
fs_1.writeFile('snippets/latex.json', out, (err) => { });
//# sourceMappingURL=snippets.js.map