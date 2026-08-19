<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Share-link passwords moved from a reversible encrypted cast to one-way
     * bcrypt hashing. Stored encrypted values can't be verified by Hash::check,
     * so clear them and drop the gate — owners re-enable protection with a
     * fresh password from the share modal. Silently keeping the gate on with
     * an uncheckable password would lock every visitor out instead.
     */
    public function up(): void
    {
        DB::table('resume_share_links')
            ->whereNotNull('password')
            ->update(['password' => null, 'require_password' => false]);
    }

    public function down(): void
    {
        // Forward-only, matching this project's migration policy.
    }
};
