<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_model_rates', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            $table->string('model');
            $table->decimal('input_cost_per_million', 10, 6);
            $table->decimal('output_cost_per_million', 10, 6);
            $table->date('effective_from');
            $table->timestamps();

            $table->index(['provider', 'model', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_model_rates');
    }
};
