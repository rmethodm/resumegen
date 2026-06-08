<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('master_resume_id')
                ->nullable()
                ->constrained('resumes')
                ->nullOnDelete()
                ->after('ab_parent_id');
            $table->boolean('is_master')->default(false)->after('master_resume_id');
            $table->timestamp('master_synced_at')->nullable()->after('is_master');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropForeign(['master_resume_id']);
            $table->dropColumn(['master_resume_id', 'is_master', 'master_synced_at']);
        });
    }
};
