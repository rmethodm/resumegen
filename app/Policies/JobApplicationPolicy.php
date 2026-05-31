<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;

class JobApplicationPolicy
{
    public function view(User $user, JobApplication $application): bool
    {
        return $user->id === $application->user_id;
    }

    public function update(User $user, JobApplication $application): bool
    {
        return $user->id === $application->user_id;
    }

    public function delete(User $user, JobApplication $application): bool
    {
        return $user->id === $application->user_id;
    }
}
