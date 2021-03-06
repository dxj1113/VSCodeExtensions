import { Connection, TextDocumentUri } from './vscode.workspaceFolders';
import * as vscode from './vscode.workspaceFolders';
import { ExcludeFilesGlobMap } from 'cspell';
import { CSpellUserSettings } from './cspellConfig';
export interface Settings {
    cSpell?: CSpellUserSettings;
    search?: {
        exclude?: ExcludeFilesGlobMap;
    };
}
export declare class DocumentSettings {
    readonly connection: Connection;
    readonly defaultSettings: CSpellUserSettings;
    private _settingsByWorkspaceFolder;
    private readonly settingsByDoc;
    private _folders;
    readonly configsToImport: Set<string>;
    private _importSettings;
    constructor(connection: Connection, defaultSettings: CSpellUserSettings);
    getSettings(document: TextDocumentUri): Promise<CSpellUserSettings>;
    getUriSettings(uri?: string): Promise<CSpellUserSettings>;
    isExcluded(uri: string): Promise<boolean>;
    resetSettings(): void;
    readonly folders: Promise<vscode.WorkspaceFolder[]>;
    private readonly settingsByWorkspaceFolder;
    readonly importSettings: CSpellUserSettings;
    registerConfigurationFile(path: string): void;
    private fetchUriSettings(uri);
    private findMatchingFolderSettings(docUri);
    private fetchFolders();
    private fetchFolderSettings();
}
