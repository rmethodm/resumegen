<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            // Client-generated identity for idempotent offline creates from
            // the iPad app. Unique per user, not globally — two users may
            // coincidentally collide and neither should error.
            $table->uuid('client_uuid')->nullable()->after('group_id');
            $table->unique(['user_id', 'client_uuid']);
        });

        // Deletion log so the iPad app's `since` pull can learn about hard
        // deletes without the resumes table growing soft-delete semantics.
        Schema::create('resume_deletions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('resume_id');
            $table->timestamp('deleted_at');
            $table->index(['user_id', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'client_uuid']);
            $table->dropColumn('client_uuid');
        });
        Schema::dropIfExists('resume_deletions');
    }
};
