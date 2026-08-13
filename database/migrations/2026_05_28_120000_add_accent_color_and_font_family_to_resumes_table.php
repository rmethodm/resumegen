<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('accent_color', 7)->nullable()->default('#4f46e5')->after('template');
            $table->string('font_family', 10)->nullable()->default('sans')->after('accent_color');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('resumes')) {
            return;
        }

        Schema::table('resumes', function (Blueprint $table) {
            foreach (['accent_color', 'font_family'] as $column) {
                if (Schema::hasColumn('resumes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
