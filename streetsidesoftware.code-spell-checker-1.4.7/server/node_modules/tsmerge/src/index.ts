import assign = require('object-assign');

/**
 * merges all the objects together from left to right.
 * right most objects will over
 */
export function merge<A>(a: A): A;
export function merge<A, B>(a: A, b: B): A & B;
export function merge<A, B, C>(a: A, b: B, c: C): A & B & C;
export function merge<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
export function merge<A, B, C, D, E>(a: A, b: B, c: C, d: D, e: E): A & B & C & D & E;
export function merge<T>(...t: T[]): T;
export function merge<T>(...t: T[]): T {
    return assign({}, ...t) as T;
}
