<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            // ready | parsing | failed — set by ParseResume, polled by the import page.
            $table->string('import_state')->default('ready');
            $table->text('import_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropColumn(['import_state', 'import_error']);
        });
    }
};
