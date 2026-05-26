<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeShareLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_link_auto_generates_token(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);
        $link = $resume->shareLinks()->create(['label' => 'Test link']);

        $this->assertNotEmpty($link->token);
        $this->assertSame(48, strlen($link->token));
        $this->assertTrue($link->is_active);
    }

    public function test_question_belongs_to_share_link_and_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);
        $link = $resume->shareLinks()->create([]);
        $question = ResumeQuestion::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'sender_phone' => '555-1234',
            'message' => 'Are you available?',
        ]);

        $this->assertTrue($question->shareLink->is($link));
        $this->assertTrue($question->resume->is($resume));
    }
}
