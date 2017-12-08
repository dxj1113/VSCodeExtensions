"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("./vscode.workspaceFolders");
const path = require("path");
const CSpell = require("cspell");
const vscode_uri_1 = require("vscode-uri");
const core_1 = require("./core");
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
        this._version = 0;
    }
    async getSettings(document) {
        return this.getUriSettings(document.uri);
    }
    async getUriSettings(uri) {
        const key = uri || '';
        const s = this.settingsByDoc.get(key);
        if (s) {
            return s;
        }
        core_1.log('getUriSettings:', uri);
        const r = uri
            ? await this.fetchUriSettings(uri)
            : CSpell.mergeSettings(this.defaultSettings, this.importSettings);
        this.settingsByDoc.set(key, r);
        return r;
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
        core_1.log(`resetSettings`);
        this._settingsByWorkspaceFolder = undefined;
        this.settingsByDoc.clear();
        this._folders = undefined;
        this._importSettings = undefined;
        this._version += 1;
    }
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
            core_1.log(`importSettings`);
            const importPaths = [...configsToImport.keys()].sort();
            this._importSettings = CSpell.readSettingsFiles(importPaths);
        }
        return this._importSettings;
    }
    get version() {
        return this._version;
    }
    registerConfigurationFile(path) {
        core_1.log('registerConfigurationFile:', path);
        configsToImport.add(path);
        this._importSettings = undefined;
    }
    async fetchUriSettings(uri) {
        core_1.log('Start fetchUriSettings:', uri);
        const folderSettings = (await this.findMatchingFolderSettings(uri)).map(s => s.settings);
        const spellSettings = CSpell.mergeSettings(this.defaultSettings, this.importSettings, ...folderSettings);
        core_1.log('Finish fetchUriSettings:', uri);
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
        core_1.log('fetchFolderSettings');
        const folders = await this.fetchFolders();
        const workplaceSettings = readAllWorkspaceFolderSettings(folders);
        const extSettings = workplaceSettings.map(async ([uri, settings]) => {
            const configs = await vscode.getConfiguration(this.connection, [
                { scopeUri: uri, section: 'cSpell' },
                { section: 'search' }
            ]);
            const [cSpell, search] = configs;
            const { exclude = {} } = search;
            const mergedSettings = CSpell.mergeSettings(settings, cSpell);
            const { ignorePaths = [] } = mergedSettings;
            const globs = defaultExclude.concat(ignorePaths, CSpell.ExclusionHelper.extractGlobsFromExcludeFilesGlobMap(exclude));
            const root = vscode_uri_1.default.parse(uri).path;
            const fnFileExclusionTest = CSpell.ExclusionHelper.generateExclusionFunctionForUri(globs, root);
            const ext = {
                uri,
                vscodeSettings: { cSpell },
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
    const paths = workspaceRoot ? [
        path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename.toLowerCase()),
        path.join(workspaceRoot, '.vscode', CSpell.defaultSettingsFilename),
        path.join(workspaceRoot, CSpell.defaultSettingsFilename.toLowerCase()),
        path.join(workspaceRoot, CSpell.defaultSettingsFilename),
    ] : [];
    return paths.map(path => vscode_uri_1.default.parse(path))
        .map(uri => uri.fsPath);
}
function readAllWorkspaceFolderSettings(workspaceFolders) {
    CSpell.clearCachedSettings();
    return workspaceFolders
        .map(folder => folder.uri)
        .map(uri => [uri, configPathsForRoot(uri)])
        .map(([uri, paths]) => [uri, readSettingsFiles(paths)]);
}
function readSettingsFiles(paths) {
    core_1.log(`readSettingsFiles:`, paths);
    return CSpell.readSettingsFiles(paths);
}
//# sourceMappingURL=documentSettings.js.map