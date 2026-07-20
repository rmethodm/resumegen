<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_pairings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('billing_key');
            $table->string('company')->nullable();
            $table->string('title')->nullable();
            $table->unsignedInteger('price_cents')->default(0);
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
        });

        // Partial unique index: one *live* pairing per job per user. Refunded rows step
        // aside so a job refunded by mistake can be purchased again. Postgres and SQLite
        // both support this, so tests exercise the real constraint, not a weaker stand-in.
        DB::statement(
            'CREATE UNIQUE INDEX job_pairings_user_billing_key_live
             ON job_pairings (user_id, billing_key) WHERE refunded_at IS NULL'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('job_pairings');
    }
};
