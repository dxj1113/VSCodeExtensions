"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function asPromise(fn) {
    return function (...args) {
        const p = new Promise((resolve, reject) => {
            return fn.apply(this, [...args, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                }]);
        });
        return p;
    };
}
exports.asPromise = asPromise;
//# sourceMappingURL=asPromise.js.map