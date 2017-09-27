import { TextDocument, Diagnostic } from 'vscode-languageserver';
import * as Rx from 'rxjs/Rx';
export declare const diagSource = "cSpell Checker";
export { validateText } from 'cspell';
import { CSpellUserSettings } from './cspellConfig';
export declare const defaultCheckLimit = 500;
export declare function validateTextDocument(textDocument: TextDocument, options: CSpellUserSettings): Promise<Diagnostic[]>;
export declare function validateTextDocumentAsync(textDocument: TextDocument, options: CSpellUserSettings): Rx.Observable<Diagnostic>;
