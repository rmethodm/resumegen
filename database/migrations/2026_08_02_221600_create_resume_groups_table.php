<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_groups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->default('');
            $table->timestamps();
        });

        // Nullable, but the Resume::creating hook always populates it, so no row
        // ever actually holds null. Kept nullable to avoid a not-null column
        // change over the backfill, which the SQLite test grammar rebuilds the
        // whole table for. ponytail: nullable + guaranteed-populated invariant.
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('group_id')->nullable()->after('user_id')
                ->constrained('resume_groups')->cascadeOnDelete();
        });

        // Backfill one group per existing resume.
        foreach (DB::table('resumes')->orderBy('id')->get() as $resume) {
            $groupId = DB::table('resume_groups')->insertGetId([
                'user_id' => $resume->user_id,
                'title' => $resume->title,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('resumes')->where('id', $resume->id)->update(['group_id' => $groupId]);
        }
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('group_id');
        });
        Schema::dropIfExists('resume_groups');
    }
};
