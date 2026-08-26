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
        if (! Schema::hasTable('ai_requests') || ! Schema::hasColumn('ai_requests', 'job_pairing_id')) {
            return;
        }

        $hasJobPairingForeign = false;

        foreach (Schema::getForeignKeys('ai_requests') as $foreignKey) {
            if (in_array('job_pairing_id', $foreignKey['columns'], true)) {
                $hasJobPairingForeign = true;
                break;
            }
        }

        if ($hasJobPairingForeign) {
            Schema::table('ai_requests', function (Blueprint $table): void {
                $table->dropForeign(['job_pairing_id']);
            });
        }

        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->dropColumn('job_pairing_id');
        });
    }
};
