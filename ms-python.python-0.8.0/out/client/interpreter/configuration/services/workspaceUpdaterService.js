"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
class WorkspacePythonPathUpdaterService {
    constructor(wkspace) {
        this.wkspace = wkspace;
    }
    updatePythonPath(pythonPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const pythonConfig = vscode_1.workspace.getConfiguration('python', this.wkspace);
            const pythonPathValue = pythonConfig.inspect('pythonPath');
            if (pythonPathValue && pythonPathValue.workspaceValue === pythonPath) {
                return;
            }
            if (pythonPath.startsWith(this.wkspace.fsPath)) {
                // tslint:disable-next-line:no-invalid-template-strings
                pythonPath = path.join('${workspaceRoot}', path.relative(this.wkspace.fsPath, pythonPath));
            }
            yield pythonConfig.update('pythonPath', pythonPath, false);
        });
    }
}
exports.WorkspacePythonPathUpdaterService = WorkspacePythonPathUpdaterService;
//# sourceMappingURL=workspaceUpdaterService.js.map