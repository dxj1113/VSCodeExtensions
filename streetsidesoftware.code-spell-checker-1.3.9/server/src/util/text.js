"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const XRegExp = require("xregexp");
const Rx = require("rx");
const rx_utils_1 = require("./rx-utils");
const regExSplitWords = XRegExp('(\\p{Ll})(\\p{Lu})', 'g');
const regExSplitWords2 = XRegExp('(\\p{Lu})(\\p{Lu}\\p{Ll}+)', 'g');
const regExWords = XRegExp("\\p{L}(?:[']\\p{L}|\\p{L})+|\\p{L}", 'g');
const regExIgnoreCharacters = XRegExp('\\p{Hiragana}|\\p{Han}|\\p{Katakana}', 'g');
const regExFirstUpper = XRegExp('^\\p{Lu}\\p{Ll}+$');
const regExAllUpper = XRegExp('^\\p{Lu}+$');
const regExAllLower = XRegExp('^\\p{Ll}+$');
function splitCamelCaseWordWithOffset(wo) {
    return Rx.Observable.fromArray(splitCamelCaseWord(wo.word))
        .scan((last, word) => ({ word, offset: last.offset + last.word.length }), { word: '', offset: wo.offset });
}
exports.splitCamelCaseWordWithOffset = splitCamelCaseWordWithOffset;
/**
 * Split camelCase words into an array of strings.
 */
function splitCamelCaseWord(word) {
    const separator = '_<^*_*^>_';
    const pass1 = XRegExp.replace(word, regExSplitWords, '$1' + separator + '$2');
    const pass2 = XRegExp.replace(pass1, regExSplitWords2, '$1' + separator + '$2');
    return XRegExp.split(pass2, separator);
}
exports.splitCamelCaseWord = splitCamelCaseWord;
/**
 * Extract out whole words from a string of text.
 */
function extractWordsFromText1(text) {
    const words = [];
    const reg = XRegExp(regExWords);
    let match;
    while (match = reg.exec(text)) {
        words.push({
            word: match[0],
            offset: match.index
        });
    }
    return words;
}
exports.extractWordsFromText1 = extractWordsFromText1;
/**
 * This function lets you iterate over regular expression matches.
 */
function* match(reg, text) {
    let match;
    while (match = reg.exec(text)) {
        yield match;
    }
}
exports.match = match;
/**
 * Extract out whole words from a string of text.
 */
function extractWordsFromTextRx(text) {
    const reg = XRegExp(regExWords);
    return Rx.Observable.from(match(reg, text))
        .map(m => ({
        word: m[0],
        offset: m.index
    }))
        .map(wo => ({
        word: XRegExp.replace(wo.word, regExIgnoreCharacters, match => ' '.repeat(match.length)).trim(),
        offset: wo.offset
    }))
        .filter(wo => !!wo.word);
}
exports.extractWordsFromTextRx = extractWordsFromTextRx;
/**
 * Extract out whole words from a string of text.
 */
function extractWordsFromText(text) {
    return rx_utils_1.observableToArray(extractWordsFromTextRx(text));
}
exports.extractWordsFromText = extractWordsFromText;
function extractWordsFromCodeRx(text) {
    return extractWordsFromTextRx(text)
        .concatMap(word => splitCamelCaseWordWithOffset(word));
}
exports.extractWordsFromCodeRx = extractWordsFromCodeRx;
function extractWordsFromCode(text) {
    return rx_utils_1.observableToArray(extractWordsFromCodeRx(text));
}
exports.extractWordsFromCode = extractWordsFromCode;
function isUpperCase(word) {
    return !!word.match(regExAllUpper);
}
exports.isUpperCase = isUpperCase;
function isLowerCase(word) {
    return !!word.match(regExAllLower);
}
exports.isLowerCase = isLowerCase;
function isFirstCharacterUpper(word) {
    return isUpperCase(word.slice(0, 1));
}
exports.isFirstCharacterUpper = isFirstCharacterUpper;
function isFirstCharacterLower(word) {
    return isLowerCase(word.slice(0, 1));
}
exports.isFirstCharacterLower = isFirstCharacterLower;
function ucFirst(word) {
    return word.slice(0, 1).toUpperCase() + word.slice(1);
}
exports.ucFirst = ucFirst;
function lcFirst(word) {
    return word.slice(0, 1).toLowerCase() + word.slice(1);
}
exports.lcFirst = lcFirst;
function snakeToCamel(word) {
    return word.split('_').map(ucFirst).join('');
}
exports.snakeToCamel = snakeToCamel;
function camelToSnake(word) {
    return splitCamelCaseWord(word).join('_').toLowerCase();
}
exports.camelToSnake = camelToSnake;
function matchCase(example, word) {
    if (example.match(regExFirstUpper)) {
        return word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase();
    }
    if (example.match(regExAllLower)) {
        return word.toLowerCase();
    }
    if (example.match(regExAllUpper)) {
        return word.toUpperCase();
    }
    if (isFirstCharacterUpper(example)) {
        return ucFirst(word);
    }
    if (isFirstCharacterLower(example)) {
        return lcFirst(word);
    }
    return word;
}
exports.matchCase = matchCase;
//# sourceMappingURL=text.js.map