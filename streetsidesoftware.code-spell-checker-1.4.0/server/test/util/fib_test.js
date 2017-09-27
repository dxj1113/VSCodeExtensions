"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Rx = require("rx");
describe('fib generator', () => {
    function* fibonacci() {
        let fn1 = 1;
        let fn2 = 1;
        while (1) {
            const current = fn2;
            fn2 = fn1;
            fn1 = fn1 + current;
            yield current;
        }
    }
    it('validates fib', () => {
        let result = [];
        Rx.Observable.from(fibonacci())
            .take(10)
            .subscribe(function (x) {
            result.push(x);
        });
        chai_1.expect(result).to.be.deep.equal([1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
    });
    it('fib from span', () => {
        return Rx.Observable.range(1, 10)
            .scan(a => [a[1], a[0] + a[1]], [0, 1])
            .map(a => a[0])
            .toArray()
            .toPromise()
            .then(result => {
            chai_1.expect(result).to.be.deep.equal([1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
        });
    });
});
//# sourceMappingURL=fib_test.js.map