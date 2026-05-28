<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resume_share_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_share_link_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('event', 32); // page_view | pdf_download | question_submitted
            $table->string('ip_hash', 64)->nullable();  // SHA-256 of IP
            $table->string('user_agent', 500)->nullable();
            $table->string('referrer')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // no updated_at — append-only

            $table->index(['resume_id', 'event']);
            $table->index(['resume_id', 'ip_hash', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_share_events');
    }
};
