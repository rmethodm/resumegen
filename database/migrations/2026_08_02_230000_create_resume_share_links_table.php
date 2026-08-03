<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_share_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resume_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('token', 40)->unique();
            $table->boolean('allow_download')->default(true);
            $table->boolean('require_email')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_share_links');
    }
};
