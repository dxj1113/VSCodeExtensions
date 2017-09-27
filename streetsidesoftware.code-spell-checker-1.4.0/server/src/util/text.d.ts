import * as Rx from 'rx';
export interface WordOffset {
    word: string;
    offset: number;
}
export declare function splitCamelCaseWordWithOffset(wo: WordOffset): Rx.Observable<WordOffset>;
/**
 * Split camelCase words into an array of strings.
 */
export declare function splitCamelCaseWord(word: string): string[];
/**
 * Extract out whole words from a string of text.
 */
export declare function extractWordsFromText1(text: string): WordOffset[];
/**
 * This function lets you iterate over regular expression matches.
 */
export declare function match(reg: RegExp, text: string): Iterable<RegExpExecArray>;
/**
 * Extract out whole words from a string of text.
 */
export declare function extractWordsFromTextRx(text: string): Rx.Observable<WordOffset>;
/**
 * Extract out whole words from a string of text.
 */
export declare function extractWordsFromText(text: string): WordOffset[];
export declare function extractWordsFromCodeRx(text: string): Rx.Observable<WordOffset>;
export declare function extractWordsFromCode(text: string): WordOffset[];
export declare function isUpperCase(word: string): boolean;
export declare function isLowerCase(word: string): boolean;
export declare function isFirstCharacterUpper(word: string): boolean;
export declare function isFirstCharacterLower(word: string): boolean;
export declare function ucFirst(word: string): string;
export declare function lcFirst(word: string): string;
export declare function snakeToCamel(word: string): string;
export declare function camelToSnake(word: string): string;
export declare function matchCase(example: string, word: string): string;
