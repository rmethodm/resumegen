<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `period` was one free-text string ("2022–Present"). The workstation
     * inspector edits the two ends separately, so split it. Existing rows keep
     * their text as the start date rather than being parsed and guessed at.
     */
    public function up(): void
    {
        Schema::table('experiences', function (Blueprint $table) {
            $table->string('start_date')->default('')->after('company');
            $table->string('end_date')->default('')->after('start_date');
            $table->boolean('is_current')->default(false)->after('end_date');
        });

        DB::table('experiences')->update(['start_date' => DB::raw('period')]);

        Schema::table('experiences', function (Blueprint $table) {
            $table->dropColumn('period');
        });
    }

    public function down(): void
    {
        Schema::table('experiences', function (Blueprint $table) {
            $table->string('period')->default('')->after('company');
        });

        DB::table('experiences')->update(['period' => DB::raw('start_date')]);

        Schema::table('experiences', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'is_current']);
        });
    }
};
