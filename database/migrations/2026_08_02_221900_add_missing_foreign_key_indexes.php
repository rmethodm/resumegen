<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Postgres doesn't auto-index FK columns like MySQL does, and these were all
     * declared with bare constrained() — every one of them sequential-scans on
     * lookup. skills.resume_id is excluded: it's already covered as the leftmost
     * column of a composite unique index. resumes.user_id got a plain index of
     * its own in a later migration despite the same coverage.
     */
    public function up(): void
    {
        Schema::table('experiences', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('projects', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('certificates', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('education', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('resume_snapshots', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('resume_notes', fn (Blueprint $table) => $table->index('resume_id'));
        Schema::table('resume_groups', fn (Blueprint $table) => $table->index('user_id'));
        Schema::table('resumes', fn (Blueprint $table) => $table->index('group_id'));
    }

    public function down(): void
    {
        Schema::table('experiences', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('projects', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('certificates', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('education', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('resume_snapshots', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('resume_notes', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('resume_groups', fn (Blueprint $table) => $table->dropIndex(['user_id']));
        Schema::table('resumes', fn (Blueprint $table) => $table->dropIndex(['group_id']));
    }
};
