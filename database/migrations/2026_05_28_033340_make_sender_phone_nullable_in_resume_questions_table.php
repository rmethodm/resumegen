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
        Schema::table('resume_questions', function (Blueprint $table) {
            $table->string('sender_phone')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('resume_questions', function (Blueprint $table) {
            $table->string('sender_phone')->nullable(false)->change();
        });
    }
};
