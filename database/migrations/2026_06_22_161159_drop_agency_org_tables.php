<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('recruiter_notes');
        Schema::dropIfExists('organization_members');
        Schema::dropIfExists('organizations');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_agency');
        });
    }

    public function down(): void
    {
        //
    }
};
