<?php

namespace App\Policies;

use App\Models\SavedSection;
use App\Models\User;

class SavedSectionPolicy
{
    public function delete(User $user, SavedSection $savedSection): bool
    {
        return $user->id === $savedSection->user_id;
    }
}
