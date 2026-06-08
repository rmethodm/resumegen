<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\RecruiterNote;
use App\Models\User;

class RecruiterNotePolicy
{
    public function upsert(User $user, RecruiterNote $note): bool
    {
        return Organization::where('id', $note->organization_id)
            ->where('owner_id', $user->id)
            ->exists();
    }
}
