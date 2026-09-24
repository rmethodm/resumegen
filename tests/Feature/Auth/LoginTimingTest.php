<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * An unknown email must cost the same password hash check as a known one,
 * otherwise login response time reveals which addresses have accounts.
 */
class LoginTimingTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_email_still_runs_a_password_hash_check(): void
    {
        Hash::shouldReceive('make')->zeroOrMoreTimes()->andReturn('dummy-hash');
        Hash::shouldReceive('check')->once()->andReturnFalse();

        $this->post('/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
