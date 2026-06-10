<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('resume_questions')) {
            return;
        }

        $now = now();

        DB::table('resume_questions')->orderBy('id')->each(function ($q) {
            $threadId = DB::table('resume_threads')->insertGetId([
                'resume_id' => $q->resume_id,
                'share_link_id' => $q->resume_share_link_id ?? null,
                'sender_name' => $q->sender_name,
                'sender_email' => $q->sender_email,
                'is_read' => $q->is_read,
                'created_at' => $q->created_at,
            ]);

            DB::table('resume_thread_messages')->insert([
                'thread_id' => $threadId,
                'body' => $q->message,
                'is_owner' => false,
                'created_at' => $q->created_at,
            ]);
        });

        Schema::dropIfExists('resume_questions');
    }

    public function down(): void
    {
        // Irreversible — restore from backup if needed
    }
};
