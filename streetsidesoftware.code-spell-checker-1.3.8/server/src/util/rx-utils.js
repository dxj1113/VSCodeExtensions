"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function observableToArray(obs) {
    let a;
    obs.toArray()
        .subscribe(items => a = items);
    return a;
}
exports.observableToArray = observableToArray;
//# sourceMappingURL=rx-utils.js.map