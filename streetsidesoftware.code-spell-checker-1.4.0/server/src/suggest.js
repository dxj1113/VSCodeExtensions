"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baseCost = 100;
const swapCost = 75;
const postSwapCost = swapCost - baseCost;
const maxNumChanges = 4;
const defaultNumberOfSuggestions = 5;
let trieNextId = 1;
/**
 *
 */
function addWordToTrie(trie, word) {
    function buildTrie(word, trieNodes) {
        const head = word.slice(0, 1);
        const tail = word.slice(1);
        const found = trieNodes.find(t => t.w === head);
        if (found) {
            found.c = head ? buildTrie(tail, found.c) : found.c;
        }
        else {
            const children = head ? buildTrie(tail, []) : [];
            const node = { k: trieNextId++, w: head, c: children };
            trieNodes.push(node);
        }
        return trieNodes;
    }
    const children = buildTrie(word, trie.c);
    return { c: children };
}
exports.addWordToTrie = addWordToTrie;
function wordListToTrie(words) {
    let trie = { c: [] };
    for (const word of words) {
        trie = addWordToTrie(trie, word);
    }
    return trie;
}
exports.wordListToTrie = wordListToTrie;
function wordsToTrie(words) {
    const trie = { c: [] };
    return words
        .reduce(addWordToTrie, trie)
        .toPromise();
}
exports.wordsToTrie = wordsToTrie;
function suggest(trie, word, numSuggestions = defaultNumberOfSuggestions) {
    return suggestA(trie, word, numSuggestions);
}
exports.suggest = suggest;
function suggestA(trie, word, numSuggestions = defaultNumberOfSuggestions) {
    let costLimit = Math.min(baseCost * word.length / 2, baseCost * maxNumChanges);
    const sugs = [];
    const matrix = [[]];
    const x = ' ' + word;
    const mx = x.length - 1;
    const curSug = [''];
    for (let i = 0; i <= mx; ++i) {
        matrix[0][i] = i * baseCost;
    }
    function processTrie(trie, d) {
        const bc = baseCost;
        const psc = postSwapCost;
        let subCost, curLetter;
        const { w, c } = trie;
        if (!w) {
            const cost = matrix[d - 1][mx];
            if (cost <= costLimit) {
                emitSug({ word: curSug.slice(1, d).join(''), cost });
            }
        }
        else {
            curSug[d] = w;
            const lastSugLetter = curSug[d - 1];
            matrix[d] = matrix[d] || [];
            matrix[d][0] = matrix[d - 1][0] + bc;
            let lastLetter = x[0];
            let min = matrix[d][0];
            for (let i = 1; i <= mx; ++i) {
                curLetter = x[i];
                subCost =
                    (w === curLetter)
                        ? 0 : (curLetter === lastSugLetter ? (w === lastLetter ? psc : bc) : bc);
                matrix[d][i] = Math.min(matrix[d - 1][i - 1] + subCost, // substitute
                matrix[d - 1][i] + bc, // insert
                matrix[d][i - 1] + bc // delete
                );
                min = Math.min(min, matrix[d][i]);
                lastLetter = curLetter;
            }
            if (min <= costLimit) {
                processTries(c, d + 1);
            }
        }
    }
    function processTries(tries, d) {
        for (const trie of tries) {
            processTrie(trie, d);
        }
    }
    function emitSug(sug) {
        sugs.push(sug);
        if (sugs.length > numSuggestions) {
            sugs.sort((a, b) => a.cost - b.cost);
            sugs.length = numSuggestions;
            costLimit = sugs[sugs.length - 1].cost;
        }
    }
    processTries(trie.c, 1);
    sugs.sort((a, b) => a.cost - b.cost);
    return sugs;
}
exports.suggestA = suggestA;
function suggestAlt(trie, word, numSuggestions = defaultNumberOfSuggestions) {
    let costLimit = Math.min(baseCost * word.length / 2, baseCost * maxNumChanges);
    const sugs = [];
    const matrix = [[]];
    const x = ' ' + word;
    const mx = x.length - 1;
    const curSug = [''];
    for (let i = 0; i <= mx; ++i) {
        matrix[0][i] = i * baseCost;
    }
    function processTrie(trie, d) {
        const bc = baseCost;
        const psc = postSwapCost;
        const { w, c } = trie;
        if (!w) {
            const cost = matrix[d - 1][mx];
            if (cost <= costLimit) {
                emitSug({ word: curSug.slice(1, d).join(''), cost });
            }
        }
        else {
            curSug[d] = w;
            const lastSugLetter = curSug[d - 1];
            matrix[d] = matrix[d] || [];
            let diag = matrix[d - 1][0];
            matrix[d][0] = diag + bc;
            let lastLetter = x[0];
            let min = matrix[d][0];
            let lastCost = min;
            // declare these here for performance reasons
            let curLetter, subCost, above;
            for (let i = 1; i <= mx; ++i) {
                curLetter = x[i];
                subCost = (w === curLetter) ? 0 : (curLetter === lastSugLetter && w === lastLetter ? psc : bc);
                above = matrix[d - 1][i];
                lastCost = Math.min(diag + subCost, // substitute
                above + bc, // insert
                lastCost + bc // delete
                );
                diag = above;
                matrix[d][i] = lastCost;
                min = Math.min(min, lastCost);
                lastLetter = curLetter;
            }
            if (min <= costLimit) {
                processTries(c, d + 1);
            }
        }
    }
    function processTries(tries, d) {
        for (const trie of tries) {
            processTrie(trie, d);
        }
    }
    function emitSug(sug) {
        sugs.push(sug);
        if (sugs.length > numSuggestions) {
            sugs.sort((a, b) => a.cost - b.cost);
            sugs.length = numSuggestions;
            costLimit = sugs[sugs.length - 1].cost;
        }
    }
    processTries(trie.c, 1);
    sugs.sort((a, b) => a.cost - b.cost);
    return sugs;
}
exports.suggestAlt = suggestAlt;
//# sourceMappingURL=suggest.js.map