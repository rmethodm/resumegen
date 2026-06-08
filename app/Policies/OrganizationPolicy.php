<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function view(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function update(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function invite(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }

    public function removeMembers(User $user, Organization $org): bool
    {
        return $user->id === $org->owner_id;
    }
}
