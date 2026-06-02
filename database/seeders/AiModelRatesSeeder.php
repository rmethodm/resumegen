<?php

namespace Database\Seeders;

use App\Models\AiModelRate;
use Illuminate\Database\Seeder;

class AiModelRatesSeeder extends Seeder
{
    public function run(): void
    {
        $rates = [
            ['provider' => 'openai',    'model' => 'gpt-4o',            'input_cost_per_million' => 2.500000, 'output_cost_per_million' => 10.000000],
            ['provider' => 'openai',    'model' => 'gpt-4o-mini',       'input_cost_per_million' => 0.150000, 'output_cost_per_million' =>  0.600000],
            ['provider' => 'anthropic', 'model' => 'claude-sonnet-4-6', 'input_cost_per_million' => 3.000000, 'output_cost_per_million' => 15.000000],
            ['provider' => 'anthropic', 'model' => 'claude-haiku-4-5',  'input_cost_per_million' => 0.800000, 'output_cost_per_million' =>  4.000000],
        ];

        foreach ($rates as $rate) {
            AiModelRate::firstOrCreate(
                ['provider' => $rate['provider'], 'model' => $rate['model'], 'effective_from' => '2026-06-02'],
                $rate + ['effective_from' => '2026-06-02']
            );
        }
    }
}
