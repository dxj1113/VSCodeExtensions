"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rx");
const fs = require("fs");
const path = require("path");
const text_1 = require("./util/text");
const suggest_1 = require("./suggest");
const sug = require("./suggest");
const Text = require("./util/text");
const minWordLength = 3;
function loadWords(filename) {
    const reader = Rx.Observable.fromNodeCallback(fs.readFile);
    return reader(filename, 'utf-8')
        .flatMap(text => Rx.Observable.from(text_1.match(/(.+)(\r?\n)?/g, text)))
        .map(regExpExecArray => regExpExecArray[1])
        .map(line => line.trim())
        .filter(line => line !== '');
}
exports.loadWords = loadWords;
function loadWordLists(filenames) {
    return processWordListLines(Rx.Observable.fromArray(filenames)
        .flatMap(loadWords))
        .tap(({ word }) => { trie = suggest_1.addWordToTrie(trie, word); })
        .last()
        .map(({ setOfWords }) => setOfWords);
}
exports.loadWordLists = loadWordLists;
function isWordInDictionary(word) {
    const nWord = word.toLocaleLowerCase();
    return wordList.then(wordList => {
        return wordList[nWord] === true
            || userWords[nWord] === true;
    });
}
exports.isWordInDictionary = isWordInDictionary;
function processWordListLines(lines) {
    return lines
        .flatMap(line => Rx.Observable.concat(
    // Add the line
    Rx.Observable.just(line), 
    // Add the individual words in the line
    Text.extractWordsFromTextRx(line)
        .flatMap(Text.splitCamelCaseWordWithOffset)
        .map(({ word }) => word)
        .filter(word => word.length > minWordLength)))
        .map(word => word.trim())
        .map(word => word.toLowerCase())
        .scan((pair, word) => {
        const { setOfWords } = pair;
        const found = setOfWords[word] === true;
        setOfWords[word] = true;
        return { found, word, setOfWords };
    }, { setOfWords: Object.create(null), found: false, word: '' })
        .filter(({ found }) => !found);
}
exports.processWordListLines = processWordListLines;
function setUserWords(...wordSets) {
    userWords = Object.create(null);
    processWordListLines(Rx.Observable.fromArray(wordSets).flatMap(a => a))
        .tap(({ word }) => { trie = suggest_1.addWordToTrie(trie, word); })
        .subscribe(({ setOfWords }) => { userWords = setOfWords; });
}
exports.setUserWords = setUserWords;
let trie = { c: [] };
let userWords = Object.create(null);
const wordList = loadWordLists([
    path.join(__dirname, '..', '..', 'dictionaries', 'wordsEn.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'typescript.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'node.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'softwareTerms.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'html.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'php.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'go.txt'),
    path.join(__dirname, '..', '..', 'dictionaries', 'companies.txt'),
])
    .toPromise();
function suggest(word, numSuggestions) {
    const searchWord = word.toLowerCase();
    return sug.suggest(trie, searchWord, numSuggestions).map(sr => sr.word);
}
exports.suggest = suggest;
//# sourceMappingURL=spellChecker.js.map