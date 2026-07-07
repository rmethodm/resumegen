<?php

namespace App\Policies;

use App\Models\ResignationLetter;
use App\Models\User;

class ResignationLetterPolicy
{
    public function view(User $user, ResignationLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function update(User $user, ResignationLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function delete(User $user, ResignationLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }
}
