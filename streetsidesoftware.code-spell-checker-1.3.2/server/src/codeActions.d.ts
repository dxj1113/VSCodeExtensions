import { TextDocuments, Command, CodeActionParams } from 'vscode-languageserver';
import { CSpellUserSettings } from 'cspell';
export declare function onCodeActionHandler(documents: TextDocuments, fnSettings: () => CSpellUserSettings): (params: CodeActionParams) => Promise<Command[]>;
