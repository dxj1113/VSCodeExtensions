import * as Rx from 'rxjs/Rx';
export interface IterableLike<T> {
    [Symbol.iterator]: () => Iterator<T> | IterableIterator<T>;
}
export declare function observableFromIterable<T>(i: IterableLike<T>): Rx.Observable<T>;
export declare function observableFromSet<T>(i: Set<T>): Rx.Observable<T>;
export declare function observableFromMap<K, V>(i: Map<K, V>): Rx.Observable<[K, V]>;
