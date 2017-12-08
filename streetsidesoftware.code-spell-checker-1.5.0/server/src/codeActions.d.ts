import { TextDocument, TextDocuments, Command, CodeActionParams } from 'vscode-languageserver';
import { CSpellUserSettings } from 'cspell';
export declare function onCodeActionHandler(documents: TextDocuments, fnSettings: (doc: TextDocument) => Promise<CSpellUserSettings>, fnSettingsVersion: (doc: TextDocument) => number): (params: CodeActionParams) => Promise<Command[]>;
