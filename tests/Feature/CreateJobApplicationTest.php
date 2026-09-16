<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateJobApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_without_base_resume_creates_only_the_card(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Product Manager',
        ])->assertRedirect(route('job-applications.index'));

        $application = $user->jobApplications()->sole();
        $this->assertNull($application->resume_id);
        $this->assertNull($application->job_description);
        $this->assertSame(0, $user->resumes()->count());
    }

    public function test_track_only_preserves_the_description_for_reopening_the_card(): void
    {
        $user = User::factory()->create();
        $description = "Own the roadmap.\nSQL and Figma.";

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Product Manager',
            'base_resume_id' => null,
            'job_description' => $description,
        ])->assertRedirect(route('job-applications.index'));

        $application = $user->jobApplications()->sole();
        $this->assertSame($description, $application->job_description);
        $this->assertNull($application->resume_id);
        $this->assertSame(0, $user->resumes()->count());

        $this->get(route('job-applications.index'))->assertInertia(fn ($page) => $page
            ->where('applications.0.job_description', $description));
    }

    public function test_store_with_base_resume_creates_a_tailored_sibling_version_and_links_it(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create(['title' => 'PM base', 'summary' => 'Ships things.']);
        Experience::factory()->for($base)->create(['title' => 'PM', 'company' => 'Old Co']);

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Product Manager',
            'base_resume_id' => $base->id,
            'job_description' => 'Own roadmap. SQL. Figma.',
        ])->assertRedirectContains('/resumes/');

        $application = $user->jobApplications()->sole();
        $version = $application->resume;
        $this->assertSame('Own roadmap. SQL. Figma.', $application->job_description);

        $this->assertNotNull($version);
        $this->assertNotSame($base->id, $version->id);
        $this->assertSame($base->group_id, $version->group_id);
        $this->assertSame('Linear – Product Manager', $version->title);
        $this->assertSame('Linear', $version->target_company);
        $this->assertSame('Product Manager', $version->target_role);
        $this->assertSame('Own roadmap. SQL. Figma.', $version->target_job_description);
        $this->assertSame('Ships things.', $version->summary);
        $this->assertSame(1, $version->experiences()->count());
        // Base is untouched.
        $this->assertNull($base->fresh()->target_job_description);
        $this->assertSame(2, $user->resumes()->count());
    }

    public function test_store_redirects_to_the_new_versions_workstation(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $base->id,
        ]);

        $version = $user->jobApplications()->sole()->resume;
        $response->assertRedirect(route('resumes.workstation', $version));
    }

    public function test_store_rejects_a_base_resume_owned_by_someone_else(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $foreign = Resume::factory()->for($other)->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $foreign->id,
        ])->assertSessionHasErrors('base_resume_id');

        $this->assertSame(0, $user->jobApplications()->count());
    }

    public function test_store_rejects_job_description_over_ten_thousand_characters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'job_description' => str_repeat('x', 10001),
        ])->assertSessionHasErrors('job_description');
    }

    public function test_store_logs_one_status_event_even_with_a_tailored_version(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $base->id,
        ]);

        $this->assertDatabaseCount('job_application_status_events', 1);
        $this->assertDatabaseHas('job_application_status_events', ['from_status' => null, 'to_status' => 'saved']);
    }
}
