import * as Rx from 'rxjs/Rx';
import {observableFromSet} from './fromIterable'; // 'rxjs-from-iterable';
import {observableFromIterable} from './fromIterable'; // 'rxjs-from-iterable';

export function uniqueWords(text: string): Rx.Observable<string> {
    const setUniqueWords = new Set(text.split(' '));
    return observableFromSet(setUniqueWords);
}


export function* genFib() {
    let [a, b] = [0, 1];
    while (true) {
        [a, b] = [b, a + b];
        yield a;
    }
}

export function fibonacci(n: number): Rx.Observable<number> {
    return observableFromIterable(genFib())
        .take(n);
}
