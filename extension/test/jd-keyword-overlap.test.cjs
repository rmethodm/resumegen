const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
    const code = fs.readFileSync(
        path.join(__dirname, '../shared/jd-keyword-overlap.js'),
        'utf8',
    );
    const module = { exports: {} };
    const sandbox = { module, exports: module.exports, console, globalThis: {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
}

const { jdKeywordOverlap } = load();

function profile(overrides = {}) {
    return {
        target_role: 'Frontend Engineer',
        summary: 'Builds accessible React interfaces.',
        experiences: [{ title: 'Frontend Engineer', company: 'Acme', bullets: ['Shipped a design system'] }],
        skills: ['React', 'TypeScript'],
        education: { school: '', degree: '', field: '' },
        ...overrides,
    };
}

describe('jdKeywordOverlap', () => {
    it('returns empty when the JD is blank', () => {
        const result = jdKeywordOverlap(profile(), '');
        assert.equal(result.score, 0);
        assert.equal(result.total, 0);
        assert.equal(result.matched.length, 0);
        assert.equal(result.missing.length, 0);
    });

    it('matches skills present on the profile', () => {
        const result = jdKeywordOverlap(profile(), 'React and TypeScript required');
        assert.ok(result.matched.includes('react'));
        assert.ok(result.matched.includes('typescript'));
        assert.equal(result.score, 100);
    });

    it('reports missing terms not found anywhere in the profile', () => {
        const result = jdKeywordOverlap(profile(), 'Requires Kubernetes and Terraform experience');
        assert.ok(result.missing.includes('kubernetes'));
        assert.ok(result.missing.includes('terraform'));
        assert.equal(result.score, 0);
    });

    it('drops stopwords and short tokens', () => {
        const result = jdKeywordOverlap(profile(), 'This is a job for the team');
        assert.equal(result.total, 0);
    });
});
