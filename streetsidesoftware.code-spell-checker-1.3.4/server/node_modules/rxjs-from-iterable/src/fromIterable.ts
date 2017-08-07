import * as Rx from 'rxjs/Rx';

export interface IterableLike<T> {
    [Symbol.iterator]: () => Iterator<T> | IterableIterator<T>;
}

export function observableFromIterable<T>(i: IterableLike<T>): Rx.Observable<T> {
    return Rx.Observable.from(i as any);
}

export function observableFromSet<T>(i: Set<T>): Rx.Observable<T> {
    return observableFromIterable(i);
}

export function observableFromMap<K, V>(i: Map<K, V>): Rx.Observable<[K, V]> {
    return observableFromIterable(i);
}
