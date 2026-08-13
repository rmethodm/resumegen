<?php

namespace App\Policies;

use App\Models\JobSearch;
use App\Models\User;

class JobSearchPolicy
{
    public function view(User $user, JobSearch $jobSearch): bool
    {
        return $user->id === $jobSearch->user_id;
    }

    public function update(User $user, JobSearch $jobSearch): bool
    {
        return $user->id === $jobSearch->user_id;
    }

    public function delete(User $user, JobSearch $jobSearch): bool
    {
        return $user->id === $jobSearch->user_id;
    }
}
