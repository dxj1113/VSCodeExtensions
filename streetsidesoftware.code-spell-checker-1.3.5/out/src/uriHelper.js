"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportedSchemes = ['file', 'untitled'];
exports.setOfSupportedSchemes = new Set(exports.supportedSchemes);
function isSupportedUri(uri) {
    return exports.setOfSupportedSchemes.has(uri.scheme);
}
exports.isSupportedUri = isSupportedUri;
//# sourceMappingURL=uriHelper.js.map