<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_credit_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('amount'); // positive = grant, negative = spend
            $table->string('reason', 32); // starter|purchase|spend|admin
            $table->string('feature', 64)->nullable();
            $table->foreignId('ai_request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('ai_starter_credits_granted_at')->nullable()->after('ai_blocked');
        });
    }

    public function down(): void
    {
        //
    }
};
