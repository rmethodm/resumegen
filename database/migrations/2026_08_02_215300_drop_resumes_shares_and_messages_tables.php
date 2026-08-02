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
        Schema::table('job_applications', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('resume_id');
        });

        Schema::dropIfExists('resume_thread_messages');
        Schema::dropIfExists('resume_threads');
        Schema::dropIfExists('resume_share_events');
        Schema::dropIfExists('resume_notes');
        Schema::dropIfExists('resume_section_events');
        Schema::dropIfExists('resume_tags');
        Schema::dropIfExists('resume_share_links');
        Schema::dropIfExists('resumes');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
