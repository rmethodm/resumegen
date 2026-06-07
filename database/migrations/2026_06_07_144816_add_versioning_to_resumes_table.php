<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('parent_resume_id')->nullable()->after('user_id')
                ->constrained('resumes')->nullOnDelete();
            $table->boolean('is_snapshot')->default(false)->after('parent_resume_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropForeign(['parent_resume_id']);
            $table->dropColumn(['parent_resume_id', 'is_snapshot']);
        });
    }
};
