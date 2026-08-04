<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Collapse the retired template catalogue onto the four kept themes.
 * Forward-only: empty down() (project policy).
 */
return new class extends Migration
{
    /**
     * @var array<string, string>
     */
    private const MAP = [
        'ats' => 'ats-plain',
        'federal' => 'ats-plain',
        'ivy-serif' => 'classic',
        'centered-traditional' => 'classic',
        'academic-cv' => 'classic',
        'consulting-ledger' => 'classic',
        'reverse-chronological' => 'classic',
        'sales-quota-table' => 'classic',
        'executive' => 'classic',
        'entry-level' => 'modern',
        'metric-cards' => 'modern',
        'accent-rule' => 'modern',
        'career-change' => 'modern',
        'startup-one-pager' => 'modern',
        'clinical' => 'modern',
        'education' => 'modern',
        'skills-first' => 'modern',
        'engineering' => 'modern',
        'it-competency-matrix' => 'modern',
        'minimal' => 'minimalist',
        'minimal-ruled' => 'minimalist',
        'bold' => 'minimalist',
        'academic' => 'classic',
    ];

    public function up(): void
    {
        // Postgres only — SQLite tests recreate schema from migrations and
        // do not need a runtime default change; app code defaults to ats-plain.
        if (Schema::hasColumn('resumes', 'template') && DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE resumes ALTER COLUMN template SET DEFAULT 'ats-plain'");
        }

        foreach (self::MAP as $from => $to) {
            DB::table('resumes')->where('template', $from)->update(['template' => $to]);

            if (Schema::hasColumn('users', 'preferred_template')) {
                DB::table('users')->where('preferred_template', $from)->update(['preferred_template' => $to]);
            }
        }

        // Any other non-empty value not in the kept set → ats-plain.
        $kept = ['ats-plain', 'classic', 'modern', 'minimalist'];
        DB::table('resumes')
            ->whereNotNull('template')
            ->where('template', '!=', '')
            ->whereNotIn('template', $kept)
            ->update(['template' => 'ats-plain']);

        if (Schema::hasColumn('users', 'preferred_template')) {
            DB::table('users')
                ->whereNotNull('preferred_template')
                ->where('preferred_template', '!=', '')
                ->whereNotIn('preferred_template', $kept)
                ->update(['preferred_template' => 'ats-plain']);
        }
    }

    public function down(): void
    {
        //
    }
};
