<?php

namespace App\Models;

use Database\Factories\JobSkillFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobSkill extends Model
{
    /** @use HasFactory<JobSkillFactory> */
    use HasFactory;

    protected $fillable = ['category', 'name'];
}
