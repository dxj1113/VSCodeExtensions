'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const spellProvider_1 = require("./features/spellProvider");
function activate(context) {
    let linter = new spellProvider_1.default();
    linter.activate(context);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map