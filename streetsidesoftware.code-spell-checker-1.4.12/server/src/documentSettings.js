"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("./vscode.workspaceFolders");
const path = require("path");
const CSpell = require("cspell");
const vscode_uri_1 = require("vscode-uri");
const defaultExclude = [
    'debug:*',
    'debug:/**',
    'vscode:/**',
    'private:/**',
    'markdown:/**',
    'git-index:/**',
    '**/*.rendered',
    '**/*.*.rendered',
    '__pycache__/**',
];
class DocumentSettings {
    constructor(connection, defaultSettings) {
        this.connection = connection;
        this.defaultSettings = defaultSettings;
        this.settingsByDoc = new Map();
        this.configsToImport = new Set();
    }
    async getSettings(document) {
        return this.getUriSettings(document.uri);
    }
    ;
    async getUriSettings(uri) {
        if (!uri) {
            return CSpell.mergeSettings(this.defaultSettings, this.importSettings);
        }
        return this.fetchUriSettings(uri);
    }
    async isExcluded(uri) {
        const settingsByWorkspaceFolder = await this.findMatchingFolderSettings(uri);
        const fnExclTests = settingsByWorkspaceFolder.map(s => s.fnFileExclusionTest);
        for (const fn of fnExclTests) {
            if (fn(uri)) {
                return true;
            }
        }
        return false;
    }
    resetSettings() {
        this._settingsByWorkspaceFolder = undefined;
        this.settingsByDoc.clear();
        this._folders = undefined;
        this._importSettings = undefined;
    }
    ;
    get folders() {
        if (!this._folders) {
            this._folders = this.fetchFolders();
        }
        return this._folders;
    }
    get settingsByWorkspaceFolder() {
        if (!this._settingsByWorkspaceFolder) {
            this._settingsByWorkspaceFolder = this.fetchFolderSettings();
        }
        return this._settingsByWorkspaceFolder;
    }
    get importSettings() {
        if (!this._importSettings) {
            const importPaths = [...configsToImport.keys()].sort();
            this._importSettings = CSpell.readSettingsFiles(importPaths);
        }
        return this._importSettings;
    }
    registerConfigurationFile(path) {
        configsToImport.add(path);
    }
    async fetchUriSettings(uri) {
        const folderSettings = (await this.findMatchingFolderSettings(uri)).map(s => s.settings);
        const spellSettings = CSpell.mergeSettings(this.defaultSettings, this.importSettings, ...folderSettings);
        return spellSettings;
    }
    async findMatchingFolderSettings(docUri) {
        const settingsByFolder = await this.settingsByWorkspaceFolder;
        return [...settingsByFolder.values()]
            .filter(({ uri }) => uri === docUri.slice(0, uri.length))
            .sort((a, b) => a.uri.length - b.uri.length)
            .reverse();
    }
    async fetchFolders() {
        return await vscode.getWorkspaceFolders(this.connection) || [];
    }
    async fetchFolderSettings() {
        const folders = await this.fetchFolders();
        const workplaceSettings = readAllWorkspaceFolderSettings(folders);
        const extSettings = workplaceSettings.map(async ([uri, settings]) => {
            const vsCodeSetting = await vscode.getConfiguration(this.connection, uri);
            const { search = {}, cSpell = {} } = vsCodeSetting;
            const { exclude = {} } = search;
            const mergedSettings = CSpell.mergeSettings(settings, cSpell);
            const { ignorePaths = [] } = mergedSettings;
            const globs = defaultExclude.concat(ignorePaths, CSpell.ExclusionHelper.extractGlobsFromExcludeFilesGlobMap(exclude));
            const root = vscode_uri_1.default.parse(uri).path;
            const fnFileExclusionTest = CSpell.ExclusionHelper.generateExclusionFunctionForUri(globs, root);
            const ext = {
                uri,
                vscodeSettings: vsCodeSetting,
                settings: mergedSettings,
                fnFileExclusionTest,
            };
            return ext;
        });
        return new Map((await Promise.all(extSettings)).map(s => [s.uri, s]));
    }
}
exports.DocumentSettings = DocumentSettings;
const configsToImport = new Set();
function configPathsForRoot(workspaceRoot) {
    return workspaceRoot ? [
        path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename.toLowerCase()),
        path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename),
        path.join(workspaceRoot, CSpell.defaultSettingsFilename.toLowerCase()),
        path.join(workspaceRoot, CSpell.defaultSettingsFilename),
    ] : [];
}
function readAllWorkspaceFolderSettings(workspaceFolders) {
    return workspaceFolders
        .map(folder => folder.uri)
        .map(uri => [uri, configPathsForRoot(uri)])
        .map(([uri, paths]) => [uri, CSpell.readSettingsFiles(paths)]);
}
//# sourceMappingURL=documentSettings.js.map