<?php

use App\Models\Resume;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->text('search_text')->nullable();
        });

        // Backfill existing rows by re-saving through the model hook.
        // Must fire events (saveQuietly() would skip the `saving` hook that
        // populates search_text, leaving every backfilled row NULL).
        // timestamps = false avoids bumping updated_at on backfill.
        // Guarded: Resume was deleted along with the resumes feature, so on a
        // fresh migrate this class no longer exists — the table is always
        // empty at this point anyway, so there is nothing to backfill.
        if (class_exists(Resume::class, false)) {
            Resume::query()->chunkById(200, function ($resumes) {
                foreach ($resumes as $resume) {
                    $resume->timestamps = false;
                    $resume->save();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn('search_text');
        });
    }
};
