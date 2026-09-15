/**
 * Node tests for screening-question field detection.
 * Run: node --test extension/test/question-detection.test.cjs
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

function textareaSignals(label, raw = {}) {
    return H.buildSignals({ tag: 'textarea', label, ...raw });
}

describe('detectQuestionCandidate', () => {
    it('flags a plain free-text question in a textarea', () => {
        const signals = textareaSignals('Why do you want to work with us?');
        assert.equal(H.detectQuestionCandidate(signals, 0), true);
    });

    it('excludes a textarea already claimed by a profile field', () => {
        const signals = textareaSignals('Summary');
        assert.equal(H.detectQuestionCandidate(signals, 40), false);
    });

    it('excludes cover-letter labeled fields even with no claimed score', () => {
        const signals = textareaSignals('Please attach your cover letter text below');
        assert.equal(H.detectQuestionCandidate(signals, 0), false);
    });

    it('excludes fields with a very short or missing label', () => {
        const signals = textareaSignals('Q');
        assert.equal(H.detectQuestionCandidate(signals, 0), false);
    });

    it('excludes non-multiline inputs', () => {
        const signals = H.buildSignals({ tag: 'input', type: 'text', label: 'Why do you want this role?' });
        assert.equal(H.detectQuestionCandidate(signals, 0), false);
    });

    it('flags a contenteditable div with a question label', () => {
        const signals = H.buildSignals({ tag: 'div', contentEditable: true, label: 'Tell us about a challenge you overcame' });
        assert.equal(H.detectQuestionCandidate(signals, 0), true);
    });
});

describe('isCoverLetterField', () => {
    it('matches each cover-letter phrase', () => {
        const phrases = [
            'Cover letter',
            'Letter of interest',
            'Why this letter matters to you',
            'Motivation letter',
            'Introductory letter',
        ];
        for (const phrase of phrases) {
            const signals = textareaSignals(phrase);
            assert.equal(H.isCoverLetterField(signals), true, `expected "${phrase}" to be excluded`);
        }
    });

    it('does not match an unrelated question', () => {
        const signals = textareaSignals('Describe a time you resolved a conflict');
        assert.equal(H.isCoverLetterField(signals), false);
    });
});
