<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('email', 'rmethodm@outlook.com')->update(['is_master_admin' => true]);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'rmethodm@outlook.com')->update(['is_master_admin' => false]);
    }
};
