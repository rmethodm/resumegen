<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var list<string>
     */
    private array $tables = ['experiences', 'projects', 'education', 'certificates'];

    /**
     * Rows are queried and ordered by (resume_id, position) together on every
     * workstation load — the composite index covers both, making the
     * existing single-column resume_id index redundant.
     */
    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) use ($table): void {
                $t->dropIndex("{$table}_resume_id_index");
                $t->index(['resume_id', 'position']);
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t): void {
                $t->dropIndex(['resume_id', 'position']);
                $t->index('resume_id');
            });
        }
    }
};
