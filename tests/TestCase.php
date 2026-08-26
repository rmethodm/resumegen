<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Mark the session as recently password-confirmed (admin destructive tools).
     */
    protected function withConfirmedPassword(): static
    {
        return $this->withSession(['auth.password_confirmed_at' => time()]);
    }
}
