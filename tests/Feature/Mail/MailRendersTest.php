<?php

namespace Tests\Feature\Mail;

use App\Mail\TwoFactorCodeMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every other mail test in this suite calls Mail::fake(), which asserts a mailable
 * was queued but never renders its body. A dead route() or an undefined view
 * variable therefore stays invisible until the queued job throws in production —
 * which is exactly how route('billing.index') survived the billing removal inside
 * resume-view-nudge.blade.php.
 *
 * These tests render each mailable for real. They assert almost nothing about the
 * content on purpose: the render itself is the assertion, and it fails on a dead
 * route, a missing view, or an unpassed variable.
 */
class MailRendersTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_factor_code_renders(): void
    {
        $this->assertStringContainsString('123456', (new TwoFactorCodeMail('123456'))->render());
    }
}
