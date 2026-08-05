<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var list<array{table: string, column: string}>
     */
    private array $columns = [
        ['table' => 'resumes', 'column' => 'section_order'],
        ['table' => 'experiences', 'column' => 'bullets'],
        ['table' => 'projects', 'column' => 'highlights'],
        ['table' => 'resume_snapshots', 'column' => 'document'],
        ['table' => 'starter_profiles', 'column' => 'experience_snapshot'],
        ['table' => 'starter_profiles', 'column' => 'skills'],
        ['table' => 'users', 'column' => 'profile'],
    ];

    /**
     * Only pgsql has a real jsonb type — SQLite (tests) stores json as text
     * either way, so this is a genuine no-op there, not a skipped fix.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->columns as $c) {
            DB::statement(sprintf(
                'alter table %s alter column %s type jsonb using %s::jsonb',
                $c['table'],
                $c['column'],
                $c['column'],
            ));
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->columns as $c) {
            DB::statement(sprintf(
                'alter table %s alter column %s type json using %s::json',
                $c['table'],
                $c['column'],
                $c['column'],
            ));
        }
    }
};
