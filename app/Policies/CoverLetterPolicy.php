<?php

namespace App\Policies;

use App\Models\CoverLetter;
use App\Models\User;

class CoverLetterPolicy
{
    public function view(User $user, CoverLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function update(User $user, CoverLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function delete(User $user, CoverLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }
}
