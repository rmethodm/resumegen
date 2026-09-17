<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FakeAiResponse extends Model
{
    protected $fillable = ['feature', 'preset', 'payload'];

    protected $casts = [
        'payload' => 'array',
    ];
}
