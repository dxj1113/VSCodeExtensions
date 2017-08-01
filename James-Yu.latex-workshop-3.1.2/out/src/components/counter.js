"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cp = require("child_process");
class Counter {
    constructor(extension) {
        this.extension = extension;
    }
    count() {
        if (this.extension.manager.rootFile !== undefined) {
            this.extension.manager.findRoot();
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const args = configuration.get('texcount.args');
        const proc = cp.spawn(configuration.get('texcount.path'), args.concat([this.extension.manager.rootFile]));
        proc.stdout.setEncoding('utf8');
        proc.stderr.setEncoding('utf8');
        let stdout = '';
        proc.stdout.on('data', newStdout => {
            stdout += newStdout;
        });
        let stderr = '';
        proc.stderr.on('data', newStderr => {
            stderr += newStderr;
        });
        proc.on('error', err => {
            this.extension.logger.addLogMessage(`Cannot count words: ${err.message}, ${stderr}`);
            vscode.window.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.');
        });
        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot count words, code: ${exitCode}, ${stderr}`);
                vscode.window.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.');
            }
            else {
                const result = /Words in text: ([0-9]*)/g.exec(stdout);
                if (result) {
                    vscode.window.showInformationMessage(`There are ${result[1]} words in the current LaTeX project. Please refer to LaTeX Workshop Output for details.`);
                }
                this.extension.logger.addLogMessage(`TeXCount log:\n${stdout}`);
            }
        });
    }
}
exports.Counter = Counter;
//# sourceMappingURL=counter.js.map