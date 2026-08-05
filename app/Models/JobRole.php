<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobRole extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['title', 'source'];
}
