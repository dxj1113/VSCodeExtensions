"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const cp = require("child_process");
class Counter {
    constructor(extension) {
        this.extension = extension;
    }
    count(file, merge = true) {
        if (this.extension.manager.rootFile !== undefined) {
            this.extension.manager.findRoot();
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const args = configuration.get('texcount.args');
        if (merge) {
            args.push('-merge');
        }
        const proc = cp.spawn(configuration.get('texcount.path'), args.concat([file]), { cwd: path.dirname(file) });
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
                const words = /Words in text: ([0-9]*)/g.exec(stdout);
                const floats = /Number of floats\/tables\/figures: ([0-9]*)/g.exec(stdout);
                if (words) {
                    let floatMsg = '';
                    if (floats && parseInt(floats[1]) > 0) {
                        floatMsg = `and ${floats[1]} float${parseInt(floats[1]) > 1 ? 's' : ''} (tables, figures, etc.) `;
                    }
                    vscode.window.showInformationMessage(`There are ${words[1]} words ${floatMsg}in the ${merge ? 'LaTeX project' : 'opened LaTeX file'}.`);
                }
                this.extension.logger.addLogMessage(`TeXCount log:\n${stdout}`);
            }
        });
    }
}
exports.Counter = Counter;
//# sourceMappingURL=counter.js.map