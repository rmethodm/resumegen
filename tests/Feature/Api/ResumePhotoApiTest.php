<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ResumePhotoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_upload_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $response = $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", [
                'photo' => UploadedFile::fake()->image('photo.jpg', 200, 200),
            ]);

        $response->assertOk()->assertJsonStructure(['photo_url']);
        $this->assertNotNull($response->json('photo_url'));
        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_uploading_new_photo_replaces_old_one(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertOk();

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('b.jpg')])
            ->assertOk();

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_rejects_non_image_upload(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->postJson("/api/resumes/{$resume->id}/photo", [
                'photo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);
    }

    public function test_cannot_upload_photo_to_another_users_resume(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($other))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertForbidden();
    }

    public function test_can_delete_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertOk();

        $this->withToken($this->token($user))
            ->deleteJson("/api/resumes/{$resume->id}/photo")
            ->assertOk()
            ->assertJsonPath('photo_url', null);

        $this->assertCount(0, $resume->fresh()->getMedia('photo'));
    }
}
