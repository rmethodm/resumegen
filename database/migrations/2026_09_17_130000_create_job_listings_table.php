<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_listings', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('title');
            $table->string('company');
            $table->string('location')->nullable();
            $table->string('job_url');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('company');
            $table->index('location');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_listings');
    }
};
