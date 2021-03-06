'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const telemetry_1 = require("../telemetry");
const constants_1 = require("../telemetry/constants");
const proxy = require("./jediProxy");
const DOCSTRING_PARAM_PATTERNS = [
    '\\s*:type\\s*PARAMNAME:\\s*([^\\n, ]+)',
    '\\s*:param\\s*(\\w?)\\s*PARAMNAME:[^\\n]+',
    '\\s*@type\\s*PARAMNAME:\\s*([^\\n, ]+)' // Epydoc
];
/**
 * Extract the documentation for parameters from a given docstring.
 * @param {string} paramName Name of the parameter
 * @param {string} docString The docstring for the function
 * @returns {string} Docstring for the parameter
 */
function extractParamDocString(paramName, docString) {
    let paramDocString = '';
    // In docstring the '*' is escaped with a backslash
    paramName = paramName.replace(new RegExp('\\*', 'g'), '\\\\\\*');
    DOCSTRING_PARAM_PATTERNS.forEach(pattern => {
        if (paramDocString.length > 0) {
            return;
        }
        pattern = pattern.replace('PARAMNAME', paramName);
        const regExp = new RegExp(pattern);
        const matches = regExp.exec(docString);
        if (matches && matches.length > 0) {
            paramDocString = matches[0];
            if (paramDocString.indexOf(':') >= 0) {
                paramDocString = paramDocString.substring(paramDocString.indexOf(':') + 1);
            }
            if (paramDocString.indexOf(':') >= 0) {
                paramDocString = paramDocString.substring(paramDocString.indexOf(':') + 1);
            }
        }
    });
    return paramDocString.trim();
}
class PythonSignatureProvider {
    constructor(jediFactory) {
        this.jediFactory = jediFactory;
    }
    static parseData(data) {
        if (data && Array.isArray(data.definitions) && data.definitions.length > 0) {
            const signature = new vscode_1.SignatureHelp();
            signature.activeSignature = 0;
            data.definitions.forEach(def => {
                signature.activeParameter = def.paramindex;
                // Don't display the documentation, as vs code doesn't format the docmentation.
                // i.e. line feeds are not respected, long content is stripped.
                const sig = {
                    label: def.description,
                    parameters: []
                };
                sig.parameters = def.params.map(arg => {
                    if (arg.docstring.length === 0) {
                        arg.docstring = extractParamDocString(arg.name, def.docstring);
                    }
                    return {
                        documentation: arg.docstring.length > 0 ? arg.docstring : arg.description,
                        label: arg.description.length > 0 ? arg.description : arg.name
                    };
                });
                signature.signatures.push(sig);
            });
            return signature;
        }
        return new vscode_1.SignatureHelp();
    }
    provideSignatureHelp(document, position, token) {
        const cmd = {
            command: proxy.CommandType.Arguments,
            fileName: document.fileName,
            columnIndex: position.character,
            lineIndex: position.line,
            source: document.getText()
        };
        return this.jediFactory.getJediProxyHandler(document.uri).sendCommand(cmd, token).then(data => {
            return PythonSignatureProvider.parseData(data);
        });
    }
}
__decorate([
    telemetry_1.captureTelemetry(constants_1.SIGNATURE)
], PythonSignatureProvider.prototype, "provideSignatureHelp", null);
exports.PythonSignatureProvider = PythonSignatureProvider;
//# sourceMappingURL=signatureProvider.js.map