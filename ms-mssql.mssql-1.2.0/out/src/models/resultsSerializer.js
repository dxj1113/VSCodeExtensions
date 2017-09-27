"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const Constants = require("../constants/constants");
const LocalizedConstants = require("../constants/localizedConstants");
const os = require("os");
const fs = require("fs");
const serviceclient_1 = require("../languageservice/serviceclient");
const Contracts = require("../models/contracts");
const Utils = require("../models/utils");
const question_1 = require("../prompts/question");
const adapter_1 = require("../prompts/adapter");
const vscodeWrapper_1 = require("../controllers/vscodeWrapper");
const telemetry_1 = require("../models/telemetry");
let opener = require('opener');
/**
 *  Handles save results request from the context menu of slickGrid
 */
class ResultsSerializer {
    constructor(client, prompter, vscodeWrapper) {
        if (client) {
            this._client = client;
        }
        else {
            this._client = serviceclient_1.default.instance;
        }
        if (prompter) {
            this._prompter = prompter;
        }
        else {
            this._prompter = new adapter_1.default();
        }
        if (vscodeWrapper) {
            this._vscodeWrapper = vscodeWrapper;
        }
        else {
            this._vscodeWrapper = new vscodeWrapper_1.default();
        }
    }
    promptForFilepath() {
        const self = this;
        let prompted = false;
        let filepathPlaceHolder = self.resolveCurrentDirectory(self._uri);
        let questions = [
            // prompt user to enter file path
            {
                type: question_1.QuestionTypes.input,
                name: LocalizedConstants.filepathPrompt,
                message: LocalizedConstants.filepathMessage,
                placeHolder: filepathPlaceHolder,
                validate: (value) => this.validateFilePath(LocalizedConstants.filepathPrompt, value)
            },
            // prompt to overwrite file if file already exists
            {
                type: question_1.QuestionTypes.confirm,
                name: LocalizedConstants.overwritePrompt,
                message: LocalizedConstants.overwritePrompt,
                placeHolder: LocalizedConstants.overwritePlaceholder,
                shouldPrompt: (answers) => this.fileExists(answers[LocalizedConstants.filepathPrompt]),
                onAnswered: (value) => prompted = true
            }
        ];
        return this._prompter.prompt(questions).then(answers => {
            if (answers && answers[LocalizedConstants.filepathPrompt]) {
                // return filename if file does not exist or if user opted to overwrite file
                if (!prompted || (prompted && answers[LocalizedConstants.overwritePrompt])) {
                    return answers[LocalizedConstants.filepathPrompt];
                }
                // call prompt again if user did not opt to overwrite
                if (prompted && !answers[LocalizedConstants.overwritePrompt]) {
                    return self.promptForFilepath();
                }
            }
        });
    }
    fileExists(filePath) {
        const self = this;
        // resolve filepath
        if (!path.isAbsolute(filePath)) {
            filePath = self.resolveFilePath(this._uri, filePath);
        }
        if (self._isTempFile) {
            return false;
        }
        // check if file already exists on disk
        try {
            fs.statSync(filePath);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    getConfigForCsv() {
        // get save results config from vscode config
        let config = vscode.workspace.getConfiguration(Constants.extensionConfigSectionName);
        let saveConfig = config[Constants.configSaveAsCsv];
        let saveResultsParams = new Contracts.SaveResultsAsCsvRequestParams();
        // if user entered config, set options
        if (saveConfig) {
            if (saveConfig.includeHeaders !== undefined) {
                saveResultsParams.includeHeaders = saveConfig.includeHeaders;
            }
        }
        return saveResultsParams;
    }
    getConfigForJson() {
        // get save results config from vscode config
        let config = vscode.workspace.getConfiguration(Constants.extensionConfigSectionName);
        let saveConfig = config[Constants.configSaveAsJson];
        let saveResultsParams = new Contracts.SaveResultsAsJsonRequestParams();
        if (saveConfig) {
            // TODO: assign config
        }
        return saveResultsParams;
    }
    getConfigForExcel() {
        // get save results config from vscode config
        // Note: we are currently using the configSaveAsCsv setting since it has the option mssql.saveAsCsv.includeHeaders
        // and we want to have just 1 setting that lists this.
        let config = vscode.workspace.getConfiguration(Constants.extensionConfigSectionName);
        let saveConfig = config[Constants.configSaveAsCsv];
        let saveResultsParams = new Contracts.SaveResultsAsExcelRequestParams();
        // if user entered config, set options
        if (saveConfig) {
            if (saveConfig.includeHeaders !== undefined) {
                saveResultsParams.includeHeaders = saveConfig.includeHeaders;
            }
        }
        return saveResultsParams;
    }
    resolveCurrentDirectory(uri) {
        const self = this;
        self._isTempFile = false;
        let sqlUri = vscode.Uri.parse(uri);
        let currentDirectory;
        // use current directory of the sql file if sql file is saved
        if (sqlUri.scheme === 'file') {
            currentDirectory = path.dirname(sqlUri.fsPath);
        }
        else if (sqlUri.scheme === 'untitled') {
            // if sql file is unsaved/untitled but a workspace is open use workspace root
            if (vscode.workspace.rootPath) {
                currentDirectory = vscode.workspace.rootPath;
            }
            else {
                // use temp directory
                currentDirectory = os.tmpdir();
                self._isTempFile = true;
            }
        }
        else {
            currentDirectory = path.dirname(sqlUri.path);
        }
        return currentDirectory;
    }
    resolveFilePath(uri, filePath) {
        const self = this;
        let currentDirectory = self.resolveCurrentDirectory(uri);
        return path.normalize(path.join(currentDirectory, filePath));
    }
    validateFilePath(property, value) {
        if (Utils.isEmpty(value.trim())) {
            return property + LocalizedConstants.msgIsRequired;
        }
        return undefined;
    }
    getParameters(filePath, batchIndex, resultSetNo, format, selection) {
        const self = this;
        let saveResultsParams;
        if (!path.isAbsolute(filePath)) {
            this._filePath = self.resolveFilePath(this._uri, filePath);
        }
        else {
            this._filePath = filePath;
        }
        if (format === 'csv') {
            saveResultsParams = self.getConfigForCsv();
        }
        else if (format === 'json') {
            saveResultsParams = self.getConfigForJson();
        }
        else if (format === 'excel') {
            saveResultsParams = self.getConfigForExcel();
        }
        saveResultsParams.filePath = this._filePath;
        saveResultsParams.ownerUri = this._uri;
        saveResultsParams.resultSetIndex = resultSetNo;
        saveResultsParams.batchIndex = batchIndex;
        if (this.isSelected(selection)) {
            saveResultsParams.rowStartIndex = selection.fromRow;
            saveResultsParams.rowEndIndex = selection.toRow;
            saveResultsParams.columnStartIndex = selection.fromCell;
            saveResultsParams.columnEndIndex = selection.toCell;
        }
        return saveResultsParams;
    }
    /**
     * Check if a range of cells were selected.
     */
    isSelected(selection) {
        return (selection && !((selection.fromCell === selection.toCell) && (selection.fromRow === selection.toRow)));
    }
    /**
     * Send request to sql tools service to save a result set
     */
    sendRequestToService(filePath, batchIndex, resultSetNo, format, selection) {
        const self = this;
        let saveResultsParams = self.getParameters(filePath, batchIndex, resultSetNo, format, selection);
        let type;
        if (format === 'csv') {
            type = Contracts.SaveResultsAsCsvRequest.type;
        }
        else if (format === 'json') {
            type = Contracts.SaveResultsAsJsonRequest.type;
        }
        else if (format === 'excel') {
            type = Contracts.SaveResultsAsExcelRequest.type;
        }
        self._vscodeWrapper.logToOutputChannel(LocalizedConstants.msgSaveStarted + this._filePath);
        // send message to the sqlserverclient for converting resuts to the requested format and saving to filepath
        return self._client.sendRequest(type, saveResultsParams).then(result => {
            if (result.messages) {
                self._vscodeWrapper.showErrorMessage(LocalizedConstants.msgSaveFailed + result.messages);
                self._vscodeWrapper.logToOutputChannel(LocalizedConstants.msgSaveFailed + result.messages);
            }
            else {
                self._vscodeWrapper.showInformationMessage(LocalizedConstants.msgSaveSucceeded + this._filePath);
                self._vscodeWrapper.logToOutputChannel(LocalizedConstants.msgSaveSucceeded + filePath);
                self.openSavedFile(self._filePath, format);
            }
            // telemetry for save results
            telemetry_1.default.sendTelemetryEvent('SavedResults', { 'type': format });
        }, error => {
            self._vscodeWrapper.showErrorMessage(LocalizedConstants.msgSaveFailed + error.message);
            self._vscodeWrapper.logToOutputChannel(LocalizedConstants.msgSaveFailed + error.message);
        });
    }
    /**
     * Handle save request by getting filename from user and sending request to service
     */
    onSaveResults(uri, batchIndex, resultSetNo, format, selection) {
        const self = this;
        this._uri = uri;
        // prompt for filepath
        return self.promptForFilepath().then(function (filePath) {
            if (!Utils.isEmpty(filePath)) {
                self.sendRequestToService(filePath, batchIndex, resultSetNo, format, selection ? selection[0] : undefined);
            }
        });
    }
    /**
     * Open the saved file in a new vscode editor pane
     */
    openSavedFile(filePath, format) {
        const self = this;
        if (format === 'excel') {
            // This will not open in VSCode as it's treated as binary. Use the native file opener instead
            // Note: must use filePath here, URI does not open correctly
            opener(filePath, undefined, (error, stdout, stderr) => {
                if (error) {
                    self._vscodeWrapper.showErrorMessage(error);
                }
            });
        }
        else {
            let uri = vscode.Uri.file(filePath);
            self._vscodeWrapper.openTextDocument(uri).then((doc) => {
                // Show open document and set focus
                self._vscodeWrapper.showTextDocument(doc, 1, false).then(undefined, (error) => {
                    self._vscodeWrapper.showErrorMessage(error);
                });
            }, (error) => {
                self._vscodeWrapper.showErrorMessage(error);
            });
        }
    }
}
exports.default = ResultsSerializer;

//# sourceMappingURL=resultsSerializer.js.map
