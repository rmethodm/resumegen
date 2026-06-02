<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModelRate extends Model
{
    protected $fillable = [
        'provider', 'model',
        'input_cost_per_million', 'output_cost_per_million',
        'effective_from',
    ];

    protected $casts = [
        'input_cost_per_million'  => 'float',
        'output_cost_per_million' => 'float',
        'effective_from'          => 'date',
    ];
}
