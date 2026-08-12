/**
 * Node tests for shared app-base helpers.
 * Run: node --test extension/test/app-base.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInsecureRemoteUrl } from '../shared/app-base.js';

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
