const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadHeuristics() {
    const code = fs.readFileSync(
        path.join(__dirname, '../content/fill-heuristics.js'),
        'utf8',
    );
    const module = { exports: {} };
    const sandbox = { module, exports: module.exports, console, globalThis: {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
}

const H = loadHeuristics();

function fileSignals(raw) {
    return H.buildSignals({ tag: 'input', type: 'file', ...raw });
}

describe('detectFileInputCandidate', () => {
    it('flags a file input labeled Resume', () => {
        assert.equal(H.detectFileInputCandidate(fileSignals({ label: 'Resume' })), true);
    });

    it('flags a file input labeled CV', () => {
        assert.equal(H.detectFileInputCandidate(fileSignals({ label: 'Upload your CV' })), true);
    });

    it('excludes a cover letter upload', () => {
        assert.equal(H.detectFileInputCandidate(fileSignals({ label: 'Cover letter (optional)' })), false);
    });

    it('excludes an unrelated file input', () => {
        assert.equal(H.detectFileInputCandidate(fileSignals({ label: 'Profile photo' })), false);
    });

    it('excludes non-file inputs even with a resume label', () => {
        const signals = H.buildSignals({ tag: 'input', type: 'text', label: 'Resume URL' });
        assert.equal(H.detectFileInputCandidate(signals), false);
    });
});
