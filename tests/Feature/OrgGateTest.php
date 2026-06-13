<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrgGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_agency_user_cannot_open_org_create(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->actingAs($user)->get(route('org.create'))
            ->assertRedirect()
            ->assertSessionHas('featureGate');
        $this->assertDatabaseCount('organizations', 0);
    }

    public function test_non_agency_user_cannot_store_org(): void
    {
        $user = User::factory()->starter()->create();
        $this->actingAs($user)->post(route('org.store'), ['name' => 'Acme'])
            ->assertSessionHas('featureGate');
        $this->assertDatabaseCount('organizations', 0);
    }

    public function test_agency_user_can_create_org(): void
    {
        $user = User::factory()->agency()->create();
        $this->actingAs($user)->post(route('org.store'), ['name' => 'Acme'])
            ->assertRedirect(route('org.show'));
        $this->assertDatabaseHas('organizations', ['name' => 'Acme', 'owner_id' => $user->id]);
    }

    public function test_downgraded_owner_is_blocked_from_org_show(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        Organization::create(['name' => 'Old Org', 'owner_id' => $user->id]);
        $this->actingAs($user)->get(route('org.show'))
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('featureGate');
    }
}
