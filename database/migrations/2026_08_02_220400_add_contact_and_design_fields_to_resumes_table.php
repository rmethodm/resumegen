<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('phone')->default('')->after('email');
            $table->string('linkedin')->default('')->after('location');
            $table->string('website')->default('')->after('linkedin');

            // Design controls. Free strings rather than enums: the set is a
            // presentation detail that changes faster than a migration should.
            $table->string('template')->default('minimal');
            $table->string('font')->default('sans');
            $table->string('density')->default('balanced');
            $table->string('skills_layout')->default('inline');

            // Which sections show, in what order. A JSON column because the
            // list is always read and written whole.
            $table->json('section_order')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'linkedin', 'website',
                'template', 'font', 'density', 'skills_layout', 'section_order',
            ]);
        });
    }
};
