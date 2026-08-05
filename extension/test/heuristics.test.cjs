/**
 * Node tests for ATS field-matching heuristics.
 * Run: node --test extension/test/heuristics.test.cjs
 *
 * package.json has "type":"module", so we load the UMD file via vm.
 */
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
    const sandbox = {
        module,
        exports: module.exports,
        console,
        globalThis: {},
    };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
}

const H = loadHeuristics();

function field(raw) {
    return H.buildSignals(raw);
}

function bestKey(raw, keys = H.KEY_ORDER) {
    const signals = field(raw);
    let best = null;
    for (const key of keys) {
        const score = H.scoreField(signals, key);
        if (score > 0 && (!best || score > best.score)) {
            best = { key, score };
        }
    }
    return best?.key || null;
}

describe('autocomplete', () => {
    it('maps given-name to first_name', () => {
        assert.equal(bestKey({ autocomplete: 'given-name', name: 'x' }), 'first_name');
    });
    it('maps family-name to last_name', () => {
        assert.equal(bestKey({ autocomplete: 'family-name' }), 'last_name');
    });
    it('maps email autocomplete', () => {
        assert.equal(bestKey({ autocomplete: 'email', type: 'email' }), 'email');
    });
    it('maps tel to phone', () => {
        assert.equal(bestKey({ autocomplete: 'tel', type: 'tel' }), 'phone');
    });
});

describe('Greenhouse-style names', () => {
    it('job_application[first_name]', () => {
        assert.equal(bestKey({ name: 'job_application[first_name]' }), 'first_name');
    });
    it('job_application[last_name]', () => {
        assert.equal(bestKey({ name: 'job_application[last_name]' }), 'last_name');
    });
    it('job_application[email]', () => {
        assert.equal(bestKey({ name: 'job_application[email]', type: 'email' }), 'email');
    });
    it('job_application[phone]', () => {
        assert.equal(bestKey({ name: 'job_application[phone]' }), 'phone');
    });
});

describe('Workday automation ids', () => {
    it('legalNameSection_firstName', () => {
        assert.equal(
            bestKey({ dataAutomationId: 'legalNameSection_firstName' }),
            'first_name',
        );
    });
    it('legalNameSection_lastName', () => {
        assert.equal(
            bestKey({ dataAutomationId: 'legalNameSection_lastName' }),
            'last_name',
        );
    });
});

describe('Ashby system fields', () => {
    it('_systemfield_name is full_name', () => {
        assert.equal(bestKey({ name: '_systemfield_name' }), 'full_name');
    });
    it('_systemfield_email', () => {
        assert.equal(bestKey({ name: '_systemfield_email', type: 'email' }), 'email');
    });
});

describe('labels', () => {
    it('LinkedIn Profile URL', () => {
        assert.equal(bestKey({ label: 'LinkedIn Profile URL' }), 'linkedin');
    });
    it('does not put city into street address', () => {
        assert.notEqual(bestKey({ label: 'Street address', name: 'address1' }), 'location');
    });
    it('City / Location', () => {
        assert.equal(bestKey({ label: 'City', name: 'city' }), 'location');
    });
    it('Current company', () => {
        assert.equal(bestKey({ label: 'Current company' }), 'current_company');
    });
});

describe('exclusions', () => {
    it('skips phone extension', () => {
        assert.equal(bestKey({ label: 'Phone extension', name: 'phone_ext' }), null);
    });
    it('skips confirm email', () => {
        assert.equal(bestKey({ label: 'Confirm email', name: 'email_confirm' }), null);
    });
    it('does not treat first name as full name', () => {
        assert.equal(bestKey({ name: 'firstName', label: 'First name' }), 'first_name');
    });
});

describe('matchFields assignment', () => {
    it('assigns first and last without collision', () => {
        const fields = [
            { index: 0, signals: field({ name: 'job_application[first_name]', label: 'First name' }) },
            { index: 1, signals: field({ name: 'job_application[last_name]', label: 'Last name' }) },
            { index: 2, signals: field({ name: 'job_application[email]', type: 'email', label: 'Email' }) },
            { index: 3, signals: field({ name: 'job_application[phone]', label: 'Phone' }) },
            { index: 4, signals: field({ name: 'linkedin', label: 'LinkedIn' }) },
        ];
        const m = H.matchFields(fields, ['first_name', 'last_name', 'email', 'phone', 'linkedin']);
        assert.equal(m.first_name?.index, 0);
        assert.equal(m.last_name?.index, 1);
        assert.equal(m.email?.index, 2);
        assert.equal(m.phone?.index, 3);
        assert.equal(m.linkedin?.index, 4);
    });
});

describe('valuesFromProfile', () => {
    it('builds degree from education', () => {
        const v = H.valuesFromProfile({
            contact: { first_name: 'A', last_name: 'B', full_name: 'A B', email: 'a@b.c' },
            education: { school: 'State U', degree: 'B.A.', field: 'Design' },
            latest_role: { title: 'PM', company: 'Acme' },
            skills_csv: 'SQL, Figma',
        });
        assert.equal(v.school, 'State U');
        assert.equal(v.degree, 'B.A. in Design');
        assert.equal(v.current_title, 'PM');
        assert.equal(v.skills, 'SQL, Figma');
    });
});
