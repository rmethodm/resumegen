<?php

namespace App\Actions;

use App\Models\User;
use Database\Seeders\JobRolesSeeder;
use Database\Seeders\JobSkillsSeeder;
use Database\Seeders\LibrarySkillSeeder;
use Database\Seeders\SciFiJobListingsSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local testing only: erase every row in the database except one account's
 * login identity, returning that account to a brand-new state. Rows are
 * truncated in place — no tables are dropped or re-migrated.
 */
class ResetTestAccount
{
    /**
     * Tables that are not blanket-truncated: schema bookkeeping, plus the
     * login tables, which are pruned to the kept user instead.
     */
    private const PRESERVED_TABLES = ['migrations', 'users', 'passkeys', 'sessions'];

    /** @var array<int, class-string> */
    private const SEEDERS = [
        JobRolesSeeder::class,
        JobSkillsSeeder::class,
        LibrarySkillSeeder::class,
        SciFiJobListingsSeeder::class,
    ];

    public function handle(string $email): void
    {
        $user = User::where('email', $email)->firstOrFail();

        DB::transaction(function () use ($user): void {
            Schema::withoutForeignKeyConstraints(function () use ($user): void {
                foreach (Schema::getTableListing(schemaQualified: false) as $table) {
                    if (! in_array($table, self::PRESERVED_TABLES, true)) {
                        DB::table($table)->truncate();
                    }
                }

                DB::table('passkeys')->where('user_id', '!=', $user->id)->delete();
                DB::table('sessions')
                    ->where(fn ($query) => $query->whereNull('user_id')->orWhere('user_id', '!=', $user->id))
                    ->delete();
                DB::table('users')->where('id', '!=', $user->id)->delete();
            });

            // Settings go back to column defaults. Login identity (name, email,
            // password, verification, 2FA, OAuth link, passkeys) is untouched.
            $user->forceFill([
                'has_completed_onboarding' => false,
                'profile' => null,
                'target_role' => null,
                'industry' => null,
                'years_experience' => null,
                'preferred_template' => null,
                'prefers_apply_wizard' => true,
                'dismissed_checklist_at' => null,
                'stale_nudge_sent_at' => null,
                'view_nudge_sent_at' => null,
                'is_read_only' => false,
                'disabled_at' => null,
                'ai_limit_override' => null,
                'ai_blocked' => false,
                'ai_usage_reset_at' => null,
                'ai_starter_credits_granted_at' => null,
                'stripe_id' => null,
                'pm_type' => null,
                'pm_last_four' => null,
                'trial_ends_at' => null,
            ])->save();
        });

        foreach (self::SEEDERS as $seeder) {
            Artisan::call('db:seed', ['--class' => $seeder, '--force' => true]);
        }
    }
}
