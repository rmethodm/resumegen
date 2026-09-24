<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * group_id was left nullable in 2026_08_02_221600 on the promise that
 * Resume::creating always fills it — but event-less inserts (seeders using
 * WithoutModelEvents) broke that promise. Give every orphan its own
 * single-version group, mirroring Resume::booted(), then enforce NOT NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('resumes')
            ->whereNull('group_id')
            ->select(['id', 'user_id', 'title'])
            ->lazyById()
            ->each(function (object $resume): void {
                $groupId = DB::table('resume_groups')->insertGetId([
                    'user_id' => $resume->user_id,
                    'title' => $resume->title !== '' && $resume->title !== null ? $resume->title : 'Untitled resume',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('resumes')->where('id', $resume->id)->update(['group_id' => $groupId]);
            });

        Schema::table('resumes', function (Blueprint $table): void {
            $table->unsignedBigInteger('group_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->unsignedBigInteger('group_id')->nullable()->change();
        });
    }
};
