/**
 * Node tests for shared app-base helpers.
 * Run: node --test extension/test/app-base.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInsecureRemoteUrl, normalizeAppBase } from '../shared/app-base.js';

describe('normalizeAppBase', () => {
    it('upgrades remote http bases to https so the token never travels cleartext', () => {
        assert.equal(normalizeAppBase('http://resumegen.app'), 'https://resumegen.app');
    });

    it('leaves loopback http bases alone for local dev', () => {
        assert.equal(normalizeAppBase('http://localhost:8000'), 'http://localhost:8000');
        assert.equal(normalizeAppBase('http://127.0.0.1:8000'), 'http://127.0.0.1:8000');
    });

    it('still strips trailing slash and /api', () => {
        assert.equal(normalizeAppBase('https://resumegen.test/api'), 'https://resumegen.test');
    });
});

describe('isInsecureRemoteUrl', () => {
    it('flags plaintext HTTP to a remote host', () => {
        assert.equal(isInsecureRemoteUrl('http://example.com'), true);
    });

    it('allows plaintext HTTP to localhost', () => {
        assert.equal(isInsecureRemoteUrl('http://localhost:8000'), false);
        assert.equal(isInsecureRemoteUrl('http://127.0.0.1:8000'), false);
    });

    it('allows HTTPS to a remote host', () => {
        assert.equal(isInsecureRemoteUrl('https://resumegen.test'), false);
    });

    it('returns false for an unparseable URL', () => {
        assert.equal(isInsecureRemoteUrl('not a url'), false);
    });
});
