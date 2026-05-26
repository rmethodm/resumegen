<?php
namespace App\Policies;

use App\Models\ResumeShareLink;
use App\Models\User;

class ResumeShareLinkPolicy
{
    public function manage(User $user, ResumeShareLink $link): bool
    {
        return $user->id === $link->resume->user_id;
    }
}
