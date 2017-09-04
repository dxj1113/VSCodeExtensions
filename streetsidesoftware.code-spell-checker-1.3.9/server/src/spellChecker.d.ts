import * as Rx from 'rx';
export interface WordDictionary {
    [index: string]: boolean;
}
export declare function loadWords(filename: string): Rx.Observable<string>;
export declare function loadWordLists(filenames: string[]): Rx.Observable<WordDictionary>;
export declare function isWordInDictionary(word: string): Rx.Promise<boolean>;
export declare function processWordListLines(lines: Rx.Observable<string>): any;
export declare function setUserWords(...wordSets: string[][]): void;
export declare function suggest(word: string, numSuggestions?: number): string[];
