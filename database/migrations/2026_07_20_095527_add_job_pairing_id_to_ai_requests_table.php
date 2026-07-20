<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table): void {
            // Attributes an AI call to the job it was made against. Nullable because
            // free features (import, ranking, interview coach) belong to no pairing.
            $table->foreignId('job_pairing_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('job_pairing_id');
        });
    }
};
