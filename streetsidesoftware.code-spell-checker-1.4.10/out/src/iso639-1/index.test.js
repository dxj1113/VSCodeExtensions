"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const index_1 = require("./index");
describe('Validation', () => {
    it('tests normalizeCode', () => {
        chai_1.expect(index_1.normalizeCode('en')).to.be.equal('en');
        chai_1.expect(index_1.normalizeCode('en-US')).to.be.equal('en-US');
        chai_1.expect(index_1.normalizeCode('en-gb')).to.be.equal('en-GB');
        chai_1.expect(index_1.normalizeCode('en_US')).to.be.equal('en-US');
        chai_1.expect(index_1.normalizeCode('EN_us')).to.be.equal('en-US');
        chai_1.expect(index_1.normalizeCode('enUS')).to.be.equal('en-US');
        chai_1.expect(index_1.normalizeCode('bad-code')).to.be.equal('bad-code');
        chai_1.expect(index_1.normalizeCode('eses')).to.be.equal('es-ES');
        chai_1.expect(index_1.normalizeCode('walk')).to.be.equal('wa-LK');
        chai_1.expect(index_1.normalizeCode('four')).to.be.equal('fo-UR');
    });
    it('tests isValidCode', () => {
        chai_1.expect(index_1.isValidCode('en'), 'en').to.be.true;
        chai_1.expect(index_1.isValidCode('en-UK'), 'en-UK').to.be.false;
        chai_1.expect(index_1.isValidCode('en-GB'), 'en-GB').to.be.true;
        chai_1.expect(index_1.isValidCode('walk'), 'walk').to.be.false;
    });
    it('tests lookupCode', () => {
        chai_1.expect(index_1.lookupCode('')).to.be.undefined;
        chai_1.expect(index_1.lookupCode('en')).to.not.be.undefined;
        chai_1.expect(index_1.lookupCode('en').lang).to.be.equal('English');
        chai_1.expect(index_1.lookupCode('en').country).to.be.equal('');
        chai_1.expect(index_1.lookupCode('es_ES')).to.be.undefined;
        chai_1.expect(index_1.lookupCode('es-ES')).to.not.be.undefined;
        chai_1.expect(index_1.lookupCode('es-ES').lang).to.be.equal('Spanish');
        chai_1.expect(index_1.lookupCode('es-ES').country).to.be.equal('Spain');
    });
});
//# sourceMappingURL=index.test.js.map