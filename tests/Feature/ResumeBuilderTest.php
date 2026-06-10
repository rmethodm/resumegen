<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_save_minimal_ruled_template(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'template' => 'minimal-ruled',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'minimal-ruled']);
    }

    public function test_invalid_template_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'template' => 'not-a-real-template',
        ]);

        $response->assertSessionHasErrors('template');
    }

    public function test_two_column_template_is_rejected_by_validation(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), [
                'template' => 'two-column',
            ])
            ->assertSessionHasErrors('template');
    }

    public function test_user_can_duplicate_their_own_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'My CV',
            'pdf_filename' => 'my-cv.pdf',
            'summary' => 'A great developer.',
            'skills' => ['PHP', 'React'],
        ]);

        $response = $this->actingAs($user)
            ->post(route('builder.duplicate', $resume->id));

        $copy = Resume::where('name', 'Copy of My CV')->first();
        $this->assertNotNull($copy);
        $response->assertRedirect(route('builder.edit', $copy->id));
        $this->assertEquals('A great developer.', $copy->summary);
        $this->assertEquals(['PHP', 'React'], $copy->skills);
        $this->assertNotEquals($resume->id, $copy->id);
    }

    public function test_user_cannot_duplicate_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Secret CV', 'pdf_filename' => 'x.pdf']);

        $this->actingAs($other)
            ->post(route('builder.duplicate', $resume->id))
            ->assertForbidden();
    }

    public function test_mark_all_threads_read(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $resume->threads()->createMany([
            ['sender_name' => 'A', 'sender_email' => 'a@x.com', 'is_read' => false],
            ['sender_name' => 'B', 'sender_email' => 'b@x.com', 'is_read' => false],
        ]);

        $this->actingAs($user)
            ->patch(route('messages.read-all'))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_threads', ['resume_id' => $resume->id, 'is_read' => false]);
    }

    public function test_new_style_columns_have_expected_defaults(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->assertEquals('#4f46e5', $resume->fresh()->accent_color);
        $this->assertEquals('sans', $resume->fresh()->font_family);
    }

    public function test_accent_color_and_font_family_are_mass_assignable(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'Test',
            'pdf_filename' => 'test.pdf',
            'accent_color' => '#166534',
            'font_family' => 'serif',
        ]);

        $this->assertEquals('#166534', $resume->fresh()->accent_color);
        $this->assertEquals('serif', $resume->fresh()->font_family);
    }

    public function test_new_templates_are_accepted(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        foreach (['sidebar', 'creative', 'executive', 'ats'] as $template) {
            $this->actingAs($user)->put(route('builder.update', $resume->id), [
                'name' => 'Test',
                'template' => $template,
            ])->assertRedirect();

            $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => $template]);
        }
    }

    public function test_valid_accent_color_is_accepted(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'accent_color' => '#1e3a5f',
        ])->assertRedirect();

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'accent_color' => '#1e3a5f']);
    }

    public function test_invalid_accent_color_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'accent_color' => '#ff00ff',
        ])->assertSessionHasErrors('accent_color');
    }

    public function test_valid_font_family_is_accepted(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        foreach (['sans', 'serif', 'mono'] as $family) {
            $this->actingAs($user)->put(route('builder.update', $resume->id), [
                'name' => 'Test',
                'font_family' => $family,
            ])->assertRedirect();

            $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'font_family' => $family]);
        }
    }

    public function test_invalid_font_family_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'font_family' => 'comic-sans',
        ])->assertSessionHasErrors('font_family');
    }

    public function test_duplicate_copies_new_style_fields(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create([
            'name' => 'Orig',
            'pdf_filename' => 'orig.pdf',
            'template' => 'creative',
            'accent_color' => '#7f1d1d',
            'font_family' => 'serif',
        ]);

        $this->actingAs($user)->post(route('builder.duplicate', $resume->id));

        $copy = Resume::where('name', 'Copy of Orig')->first();
        $this->assertNotNull($copy);
        $this->assertEquals('creative', $copy->template);
        $this->assertEquals('#7f1d1d', $copy->accent_color);
        $this->assertEquals('serif', $copy->font_family);
    }

    public function test_edit_passes_is_first_resume_true_for_first_resume_of_new_user(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);
        $resume = $user->resumes()->create([
            'name' => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Edit')
                ->where('isFirstResume', true)
            );
    }

    public function test_edit_passes_is_first_resume_false_when_onboarding_completed(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);
        $resume = $user->resumes()->create([
            'name' => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }

    public function test_edit_passes_is_first_resume_false_when_user_has_multiple_resumes(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);
        $first = $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
        $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);

        $this->actingAs($user)
            ->get(route('builder.edit', $first->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }

    public function test_beacon_accepts_all_same_fields_as_update(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $payload = json_encode([
            'name' => 'Beacon Save',
            'template' => 'modern',
            'accent_color' => '#166534',
            'font_family' => 'serif',
            'summary' => 'Updated via beacon',
            '_token' => csrf_token(),
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->call('POST', route('builder.beacon', $resume->id), [], [], [], [], $payload);

        $response->assertNoContent();
        $this->assertDatabaseHas('resumes', [
            'id' => $resume->id,
            'name' => 'Beacon Save',
            'template' => 'modern',
            'summary' => 'Updated via beacon',
        ]);
    }

    public function test_free_user_can_use_all_templates_including_creative(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->put(route('builder.update', $resume->id), ['template' => 'creative'])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'creative']);
    }

    public function test_starter_user_can_use_restricted_template(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->put(route('builder.update', $resume->id), ['template' => 'creative'])
            ->assertRedirect();

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'creative']);
    }

    public function test_free_user_cannot_download_docx(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->get(route('builder.docx', $resume->id))
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'docx_export');
    }

    public function test_starter_user_can_download_docx(): void
    {
        $user = User::factory()->starter()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->get(route('builder.docx', $resume->id))
            ->assertOk();
    }

    public function test_free_user_at_resume_limit_cannot_duplicate(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $r1 = $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
        $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);
        $user->resumes()->create(['name' => 'C', 'pdf_filename' => 'c.pdf']);
        $user->resumes()->create(['name' => 'D', 'pdf_filename' => 'd.pdf']);
        $user->resumes()->create(['name' => 'E', 'pdf_filename' => 'e.pdf']);

        $this->actingAs($user)
            ->post(route('builder.duplicate', $r1->id))
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'resume_limit');
    }

    public function test_free_user_can_use_skills_first_template(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => 'skills-first'])
            ->assertRedirect();

        $this->assertSame('skills-first', $resume->fresh()->template);
    }

    public function test_free_user_can_use_bold_template(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => 'bold'])
            ->assertRedirect();

        $this->assertSame('bold', $resume->fresh()->template);
    }

    public function test_free_user_can_use_skills_first_visual_template(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => 'skills-first-visual'])
            ->assertRedirect();

        $this->assertSame('skills-first-visual', $resume->fresh()->template);
    }

    public function test_free_user_can_use_academic_template(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => 'academic'])
            ->assertRedirect();

        $this->assertSame('academic', $resume->fresh()->template);
    }

    public function test_free_user_can_use_timeline_template(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => 'timeline'])
            ->assertRedirect();

        $this->assertSame('timeline', $resume->fresh()->template);
    }

    public function test_starter_user_can_use_all_new_templates(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        foreach (['skills-first', 'skills-first-visual', 'academic', 'bold', 'timeline'] as $tpl) {
            $this->actingAs($user)
                ->put(route('builder.update', $resume), ['template' => $tpl])
                ->assertRedirect();
            $this->assertSame($tpl, $resume->fresh()->template, "Failed for template: {$tpl}");
        }
    }

    public function test_custom_sections_are_saved_on_update(): void
    {
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $customSections = [
            [
                'id' => 'abc-123',
                'name' => 'Publications',
                'entries' => [
                    [
                        'id' => 'entry-1',
                        'title' => 'My Paper',
                        'subtitle' => 'Journal of Testing',
                        'start_date' => '2024',
                        'end_date' => null,
                        'description' => '',
                        'bullets' => ['Key finding one', 'Key finding two'],
                    ],
                ],
            ],
        ];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), [
                'name' => $resume->name,
                'custom_sections' => $customSections,
            ])
            ->assertRedirect();

        $this->assertEquals($customSections, $resume->fresh()->custom_sections);
    }

    public function test_free_user_cannot_exceed_custom_section_limit(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $limit = UserLimits::customSectionLimit($user);
        $this->assertNotNull($limit, 'Free users should have a custom section limit');

        $tooMany = array_map(fn ($i) => [
            'id' => "id-{$i}",
            'name' => "Section {$i}",
            'entries' => [],
        ], range(1, $limit + 1));

        $this->actingAs($user)
            ->put(route('builder.update', $resume), [
                'name' => $resume->name,
                'custom_sections' => $tooMany,
            ])
            ->assertSessionHas('featureGate');
    }

    public function test_section_order_is_saved_on_update(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'section_order' => null]);

        $order = ['skills', 'summary', 'experience', 'education', 'certifications'];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), [
                'name' => $resume->name,
                'section_order' => $order,
            ])
            ->assertRedirect();

        $this->assertEquals($order, $resume->fresh()->section_order);
    }

    public function test_resume_with_null_section_order_uses_default_in_pdf(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'section_order' => null,
            'summary' => 'A brief summary.',
        ]);

        $response = $this->actingAs($user)
            ->get(route('builder.preview', $resume));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_two_column_template_renders_pdf(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'template' => 'two-column',
            'contact' => ['full_name' => 'Ada Lovelace', 'title' => 'Engineer'],
        ]);

        $this->actingAs($user)
            ->get(route('builder.preview', $resume))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
