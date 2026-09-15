<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_task_configs', function (Blueprint $table): void {
            $table->id();
            $table->string('command');
            $table->string('cron_expression');
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });

        // Preserve the exact current backup timing (01:00/01:30/01:45) so
        // this migration doesn't silently change production behavior — see
        // routes/console.php, now rewritten to loop over this table.
        DB::table('scheduled_task_configs')->insert([
            ['command' => 'backup:clean', 'cron_expression' => '0 1 * * *', 'enabled' => true, 'created_at' => now(), 'updated_at' => now()],
            ['command' => 'backup:run', 'cron_expression' => '30 1 * * *', 'enabled' => true, 'created_at' => now(), 'updated_at' => now()],
            ['command' => 'backup:monitor', 'cron_expression' => '45 1 * * *', 'enabled' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_task_configs');
    }
};
