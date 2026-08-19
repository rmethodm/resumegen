<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    /**
     * Clickjacking and MIME-sniffing protection must ride every web response —
     * the public share pages especially are framable targets without it.
     */
    public function test_baseline_security_headers_are_sent_on_web_responses(): void
    {
        $response = $this->get('/');

        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // HSTS is production-only — sending it from local http would be wrong.
        $response->assertHeaderMissing('Strict-Transport-Security');
    }
}
