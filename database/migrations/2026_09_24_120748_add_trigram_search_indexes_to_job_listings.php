<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Browse search runs ILIKE '%term%' (JobListingController), which a btree
 * cannot serve. Trigram GIN indexes can. PostgreSQL only, and only where
 * pg_trgm is installable — SQLite (tests) and servers without the
 * extension skip this and keep working, just unindexed.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const COLUMNS = ['title', 'description', 'company', 'location'];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || ! $this->trigramAvailable()) {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        foreach (self::COLUMNS as $column) {
            DB::statement("CREATE INDEX IF NOT EXISTS job_listings_{$column}_trgm_index ON job_listings USING gin ({$column} gin_trgm_ops)");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::COLUMNS as $column) {
            DB::statement("DROP INDEX IF EXISTS job_listings_{$column}_trgm_index");
        }
    }

    /**
     * Already installed, or installable by this role. Checked up front because
     * a failed CREATE EXTENSION would abort the migration's transaction.
     */
    private function trigramAvailable(): bool
    {
        $row = DB::selectOne(
            "select installed_version, has_database_privilege(current_user, current_database(), 'CREATE') as can_create
             from pg_available_extensions where name = 'pg_trgm'"
        );

        return $row !== null && ($row->installed_version !== null || $row->can_create);
    }
};
