<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('starter_profiles', function (Blueprint $table): void {
            $table->id();
            // One profile per user: the unique constraint is what makes
            // User::starterProfile() a hasOne rather than a hasMany.
            $table->foreignIdFor(User::class)->unique()->constrained()->cascadeOnDelete();
            $table->string('full_name')->default('');
            $table->string('headline')->default('');
            $table->string('email')->default('');
            $table->string('phone')->default('');
            $table->string('location')->default('');
            $table->string('target_role')->default('');
            $table->string('linkedin')->default('');
            $table->string('website')->default('');
            // Lists of {title, company, start_date, end_date, is_current, bullets}
            // and {category, name}. Mirrors the resume shape so seeding is a copy.
            $table->json('experience_snapshot')->nullable();
            $table->json('skills')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('starter_profiles');
    }
};
