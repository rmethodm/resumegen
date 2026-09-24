<?php

namespace App\Http\Controllers;

use App\Actions\ResetTestAccount;
use Illuminate\Http\RedirectResponse;

/**
 * Local-only /reset: wipes the database back to a single fresh test account.
 * The route is only registered when APP_ENV=local (see routes/web.php).
 */
class DevResetController extends Controller
{
    public function __invoke(ResetTestAccount $reset): RedirectResponse
    {
        abort_unless(app()->isLocal(), 404);

        $email = config('seeding.user_email');

        $reset->handle($email);

        return redirect('/dashboard')->with('success', 'Database reset to a fresh '.$email.' account.');
    }
}
