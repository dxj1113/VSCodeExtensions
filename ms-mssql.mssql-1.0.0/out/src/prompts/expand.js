'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// This code is originally from https://github.com/DonJayamanne/bowerVSCode
// License: https://github.com/DonJayamanne/bowerVSCode/blob/master/LICENSE
const vscode = require("vscode");
const prompt_1 = require("./prompt");
const EscapeException_1 = require("../utils/EscapeException");
class ExpandPrompt extends prompt_1.default {
    constructor(question) {
        super(question);
    }
    render() {
        // label indicates this is a quickpick item. Otherwise it's a name-value pair
        if (this._question.choices[0].label) {
            return this.renderQuickPick(this._question.choices);
        }
        else {
            return this.renderNameValueChoice(this._question.choices);
        }
    }
    renderQuickPick(choices) {
        const options = {
            placeHolder: this._question.message
        };
        return vscode.window.showQuickPick(choices, options)
            .then(result => {
            if (result === undefined) {
                throw new EscapeException_1.default();
            }
            return result || false;
        });
    }
    renderNameValueChoice(choices) {
        const choiceMap = this._question.choices.reduce((result, choice) => {
            result[choice.name] = choice.value;
            return result;
        }, {});
        const options = {
            placeHolder: this._question.message
        };
        return vscode.window.showQuickPick(Object.keys(choiceMap), options)
            .then(result => {
            if (result === undefined) {
                throw new EscapeException_1.default();
            }
            // Note: cannot be used with 0 or false responses
            return choiceMap[result] || false;
        });
    }
}
exports.default = ExpandPrompt;

//# sourceMappingURL=expand.js.map
