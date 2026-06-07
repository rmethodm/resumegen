<?php

namespace Tests\Feature;

use App\Models\ApplicationContact;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationContactTest extends TestCase
{
    use RefreshDatabase;

    private function makeApplication(User $user): JobApplication
    {
        return JobApplication::factory()->create(['user_id' => $user->id]);
    }

    public function test_user_can_store_contact_on_own_application(): void
    {
        $user = User::factory()->create();
        $app = $this->makeApplication($user);

        $response = $this->actingAs($user)->postJson(route('jobs.contacts.store', $app), [
            'name' => 'Jane Smith',
            'role' => 'Recruiter',
            'email' => 'jane@example.com',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('application_contacts', ['name' => 'Jane Smith', 'job_application_id' => $app->id]);
    }

    public function test_user_gets_403_storing_on_another_users_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $app = $this->makeApplication($owner);

        $response = $this->actingAs($other)->postJson(route('jobs.contacts.store', $app), [
            'name' => 'Jane',
        ]);

        $response->assertForbidden();
    }

    public function test_missing_name_returns_422(): void
    {
        $user = User::factory()->create();
        $app = $this->makeApplication($user);

        $response = $this->actingAs($user)->postJson(route('jobs.contacts.store', $app), [
            'email' => 'jane@example.com',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_user_can_delete_own_contact(): void
    {
        $user = User::factory()->create();
        $app = $this->makeApplication($user);
        $contact = ApplicationContact::factory()->create(['job_application_id' => $app->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->deleteJson(route('jobs.contacts.destroy', [$app, $contact]));

        $response->assertNoContent();
        $this->assertModelMissing($contact);
    }

    public function test_user_gets_403_deleting_another_users_contact(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $app = $this->makeApplication($owner);
        $contact = ApplicationContact::factory()->create(['job_application_id' => $app->id, 'user_id' => $owner->id]);

        $response = $this->actingAs($other)->deleteJson(route('jobs.contacts.destroy', [$app, $contact]));

        $response->assertForbidden();
    }

    public function test_contacts_loaded_in_job_edit_props(): void
    {
        $user = User::factory()->create();
        $app = $this->makeApplication($user);
        ApplicationContact::factory()->create(['job_application_id' => $app->id, 'user_id' => $user->id, 'name' => 'Alice']);

        $response = $this->actingAs($user)->get(route('jobs.edit', $app));

        $response->assertInertia(fn ($page) => $page->has('contacts', 1));
    }
}
