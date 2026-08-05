<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('referral_events');
    }

    public function down(): void
    {
        // Forward-only.
    }
};
