<?php

namespace App\Concerns;

/**
 * Turns a failed `authorize()` into a 404 instead of Laravel's default 403.
 *
 * A 403 answers the question "does this record exist?" for anyone willing to
 * probe ids, which is the fact being protected. Every owner-scoped request
 * in this app hides behind 404.
 */
trait AbortsAsNotFound
{
    protected function failedAuthorization(): never
    {
        abort(404);
    }
}
