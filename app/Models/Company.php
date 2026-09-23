<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'source_id',
        'name',
        'website',
        'ats',
        'slug',
        'unique_id',
        'career_url',
        'founded_year',
        'size',
        'locality',
        'region',
        'country',
        'industry',
        'linkedin_url',
        'linkedin_id',
    ];
}
