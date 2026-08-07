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

describe('bestOptionMatch', () => {
    it('prefers exact text match over partial', () => {
        const options = [{ text: 'State University' }, { text: 'State' }];
        const m = H.bestOptionMatch(options, 'State');
        assert.equal(m?.index, 1);
        assert.equal(m?.score, 100);
    });

    it('matches on containment for combobox-filtered option lists', () => {
        const options = [{ text: 'United States of America' }, { text: 'United Kingdom' }];
        const m = H.bestOptionMatch(options, 'United States');
        assert.equal(m?.index, 0);
    });

    it('returns null below the confidence threshold', () => {
        const options = [{ text: 'Canada' }, { text: 'Mexico' }];
        const m = H.bestOptionMatch(options, 'United States');
        assert.equal(m, null);
    });

    it('returns null for an empty target', () => {
        const options = [{ text: 'Canada' }];
        assert.equal(H.bestOptionMatch(options, ''), null);
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

describe('skills/degree/target_role/website rules', () => {
    it('matches a skills field', () => {
        assert.equal(bestKey({ name: 'skills', label: 'Skills' }), 'skills');
    });
    it('matches a degree field', () => {
        assert.equal(bestKey({ name: 'degree', label: 'Degree' }), 'degree');
    });
    it('matches a desired-role field to target_role', () => {
        assert.equal(bestKey({ name: 'desired_role', label: 'Desired role' }), 'target_role');
    });
    it('matches a portfolio/website field', () => {
        assert.equal(bestKey({ name: 'website', label: 'Portfolio / Website' }), 'website');
    });
    it('does not match a LinkedIn field as website', () => {
        assert.notEqual(bestKey({ name: 'linkedin_url', label: 'LinkedIn' }), 'website');
    });
});

describe('full_name demotion', () => {
    it('does not score full_name for a first-name-only field', () => {
        assert.equal(H.scoreField(field({ name: 'firstName', label: 'First name' }), 'full_name'), 0);
    });
    it('still matches an explicit full-name field', () => {
        assert.equal(bestKey({ name: 'full_name', label: 'Full name' }), 'full_name');
    });
});

describe('location exclude override', () => {
    it('excludes a real street-address field', () => {
        assert.equal(bestKey({ name: 'address1', label: 'Street address' }), null);
    });
    it('does not exclude a city field just because "state" appears in its id', () => {
        assert.equal(bestKey({ id: 'candidate_state_city', name: 'city', label: 'City' }), 'location');
    });
});

describe('email/username score penalty', () => {
    it('demotes a bare "username" field below the confidence threshold', () => {
        assert.equal(H.scoreField(field({ name: 'username', label: 'Username (email)', type: 'text' }), 'email'), 0);
    });
    it('autocomplete=email overrides the username penalty', () => {
        const score = H.scoreField(
            field({ name: 'username', label: 'Username (email)', type: 'text', autocomplete: 'email' }),
            'email',
        );
        assert.ok(score > 0);
    });
});
