<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumePhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_stores_photo_in_media_collection(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('headshot.jpg', 200, 200),
            ])
            ->assertRedirect();

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_upload_replaces_previous_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('first.jpg'),
            ]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('second.jpg'),
            ]);

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_delete_removes_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $resume->addMedia(UploadedFile::fake()->image('headshot.jpg'))->toMediaCollection('photo');

        $this->actingAs($user)
            ->delete(route('builder.photo.destroy', $resume->id))
            ->assertRedirect();

        $this->assertCount(0, $resume->fresh()->getMedia('photo'));
    }

    public function test_non_owner_cannot_upload(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('headshot.jpg'),
            ])
            ->assertForbidden();
    }

    public function test_invalid_file_type_returns_422(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->postJson(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
            ])
            ->assertUnprocessable();
    }

    public function test_file_exceeding_2mb_returns_422(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->postJson(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('big.jpg')->size(2049),
            ])
            ->assertUnprocessable();
    }
}
