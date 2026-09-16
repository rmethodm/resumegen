const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
    const code = fs.readFileSync(
        path.join(__dirname, '../shared/job-posting-parse.js'),
        'utf8',
    );
    const module = { exports: {} };
    const sandbox = { module, exports: module.exports, console, globalThis: {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
}

const { parseJobPosting } = load();

// Objects returned from the vm sandbox live in a different realm, so
// assert.deepEqual's reference checks fail even on identical structure —
// compare fields individually (same pattern as heuristics.test.cjs).
function assertParsed(meta, expected) {
    const result = parseJobPosting(meta);
    assert.equal(result.company, expected.company);
    assert.equal(result.role, expected.role);
}

describe('parseJobPosting', () => {
    it('splits "Role at Company"', () => {
        assertParsed({ title: 'Software Engineer at Acme Corp' }, { company: 'Acme Corp', role: 'Software Engineer' });
    });

    it('splits "Role at Company - Site" and drops the site suffix', () => {
        assertParsed(
            { title: 'Software Engineer at Acme Corp - LinkedIn' },
            { company: 'Acme Corp', role: 'Software Engineer' },
        );
    });

    it('prefers og:site_name over a parsed company', () => {
        assertParsed(
            { title: 'Software Engineer at Acme Corp', ogSiteName: 'Greenhouse' },
            { company: 'Greenhouse', role: 'Software Engineer' },
        );
    });

    it('falls back to a pipe separator when there is no "at"', () => {
        assertParsed({ title: 'Product Manager | Greenhouse' }, { company: 'Greenhouse', role: 'Product Manager' });
    });

    it('returns the whole title as role when nothing splits', () => {
        assertParsed({ title: 'Careers' }, { company: '', role: 'Careers' });
    });

    it('prefers ogTitle over document title', () => {
        assertParsed(
            { title: 'Careers - Acme', ogTitle: 'Staff Engineer at Acme' },
            { company: 'Acme', role: 'Staff Engineer' },
        );
    });
});
