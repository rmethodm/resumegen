<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\ResumeQuestion;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestShareLinksAndQuestionsSeeder extends Seeder
{
    private array $linkLabels = [
        'LinkedIn Application',
        'Indeed Submission',
        'Company Career Portal',
        'Recruiter Outreach',
        'Referral — Jane Doe',
        'Referral — Mike Torres',
        'Job Fair — Spring 2025',
        'Networking Event',
        'Direct Application',
        'Headhunter Request',
        'Internal Promotion',
        'Contract Opportunity',
    ];

    private array $senders = [
        ['name' => 'Amanda Chen',       'email' => 'amanda.chen@techrecruit.com',    'phone' => '555-2001'],
        ['name' => 'James Porter',      'email' => 'jporter@hiringgroup.com',         'phone' => '555-2002'],
        ['name' => 'Sarah Nguyen',      'email' => 'sarah.n@talentbridge.io',         'phone' => '555-2003'],
        ['name' => 'Marcus Webb',       'email' => 'm.webb@careers.acme.com',         'phone' => '555-2004'],
        ['name' => 'Priya Patel',       'email' => 'priya.patel@globalstaffing.net', 'phone' => '555-2005'],
        ['name' => 'Tom Gallagher',     'email' => 'tgallagher@executivesearch.com',  'phone' => '555-2006'],
        ['name' => 'Rachel Kim',        'email' => 'rachel.kim@toptalent.co',         'phone' => '555-2007'],
        ['name' => 'Derek Stone',       'email' => 'dstone@hrpartners.com',           'phone' => '555-2008'],
        ['name' => 'Lisa Okafor',       'email' => 'l.okafor@rpo-solutions.com',      'phone' => '555-2009'],
        ['name' => 'Carlos Mendes',     'email' => 'carlos.m@staffingedge.com',       'phone' => '555-2010'],
        ['name' => 'Nicole Harrington', 'email' => 'n.harrington@peoplefirst.com',   'phone' => '555-2011'],
        ['name' => 'Brian Yates',       'email' => 'byates@techscout.io',             'phone' => '555-2012'],
    ];

    private array $messages = [
        "Hi, I came across your resume and I'm very impressed with your background. We have an opening that I believe would be an excellent fit for your skill set. Would you be open to a 20-minute exploratory call this week?",
        "Your experience really stands out for a senior role we're actively hiring for. The team here is top-notch and we move quickly. Can you share your availability for a brief intro call?",
        "I wanted to reach out because your profile aligns perfectly with what our client is looking for. They're a well-funded startup in the growth stage. Are you currently exploring new opportunities?",
        "We're building out a new division and your background is exactly what the hiring manager described. Compensation is very competitive. Would love to set up a time to tell you more.",
        'I noticed your resume and wanted to ask a few questions before passing it along to the hiring team. What are your salary expectations and when would you be available to start?',
        "Your skills in this area are rare and our client is eager to move quickly. They're offering remote-first work with strong equity. Could we connect for a quick call this week?",
        "Thanks for sharing your resume through our portal. We're scheduling first-round interviews now and would like to include you. Does Thursday or Friday work for a 30-minute video call?",
        "Just reviewed your background — very solid experience. We have two roles open right now that could be a great match. Let me know if you'd like details on either or both.",
        "I'm a recruiter specializing in your field and I'd love to learn more about what you're looking for in your next role. No pressure — just a conversation to understand your goals.",
        "We received your application and the team is excited to learn more. Can you confirm your current location and whether you're open to hybrid or on-site arrangements?",
        "Your resume came through a referral and I wanted to personally follow up. The role is with a well-known company and I think you'd be a strong candidate. Are you open to chatting?",
        'Quick question before I submit your profile — do you have any non-compete agreements in place, and are you comfortable with occasional travel (10–20%)? Thanks in advance.',
        "Loved your work history. We're specifically looking for someone with your combination of technical depth and leadership. The team is excited to meet candidates at your level.",
        "Hi! I found your resume through our shared network. I'm hoping to set up a quick 15-minute call to discuss a confidential search I'm running for a Director-level opening. Interested?",
        "Just a note to say we're moving forward with your application. Next steps would include a technical screen and a culture-fit interview. Does early next week work for the first round?",
        "We've reviewed your resume carefully and believe you'd be a great addition. The role includes comprehensive benefits, flexible hours, and a clear path to promotion. Let's talk!",
        'Could you clarify your experience with the specific tools mentioned in our job posting? I want to make sure I represent your background accurately to the hiring manager.',
        "We're a growing team looking for experienced professionals. Your background in this area is exactly what we need. Would you be available for a virtual coffee chat sometime this week?",
        "I'm reaching out on behalf of a client who specifically requested candidates with your background. They've asked me to move fast. Are you interviewing elsewhere right now?",
        'Great resume — clean and to the point. One question: are you open to contract-to-hire arrangements, or are you looking strictly for permanent roles? This helps me match you properly.',
        "The hiring manager flagged your resume as a priority. I'd like to schedule a call ASAP to keep things moving. What's the best number to reach you, and what's your preferred time?",
        "We're filling this role by end of month. Your profile is one of three we're considering seriously. A quick 20-minute call would help us decide. Hope to hear from you soon.",
        "I represent a company that I think you'd genuinely love working for. Culture, mission, and the team are all exceptional. I'd love to share more — are you free for a brief chat?",
        "Your resume was passed along by a mutual connection who spoke highly of you. We have an urgent need and I'd like to discuss the details if you're open to it. Thanks!",
        "Following up on your application — the team is reviewing profiles this week. Is there anything you'd like to highlight or add before we finalize our shortlist?",
        "Impressive background! We're looking for someone to step into a leadership role with real ownership. If you're interested in making a bigger impact, let's connect.",
        "I came across your profile while searching for candidates for a client of mine. They're a profitable, private company with no layoffs in 10 years. Interested in hearing more?",
        "Just wanted to make sure you received our earlier message about the open role. We're very interested in your profile and hope to connect before we close the search.",
        "Quick note — we're scheduling second-round interviews and your name came up. Can you confirm your interest and let me know your availability for the coming week?",
        "Your experience is exactly what we're missing on our current team. This is a chance to shape something meaningful from the ground up. Would love to get 20 minutes with you.",
        "Hi, I help companies hire in your field and I'm working on an exciting search right now. No obligation — I just like to keep a warm network. Would love to stay in touch.",
        'We noticed some gaps in your posted resume. Could you walk us through your experience between 2019 and 2021? The hiring team wanted clarity before moving forward.',
        "I'm collecting availability for a group interview we're organizing with the department head. Please reply with two or three windows that work for you next week. Thank you!",
        "After reviewing dozens of applications, yours stood out for both technical skills and communication clarity. We'd love to chat — our team rarely says that after the first pass.",
        "Just confirming receipt of your resume. We'll be in touch within 5 business days with next steps. In the meantime, feel free to reach out with any questions.",
        "We'd like to ask a few pre-screening questions before the formal interview. Could you reply with your desired compensation range and your notice period at your current role?",
        "The team loved your background and we're fast-tracking your application. Could we set up a technical assessment call for later this week? It's typically 45 minutes.",
        'One of our partners specifically requested I reach out to you. This is a rare opportunity — senior role, top comp, and a great team. Are you open to a conversation?',
        "Hi — I'm the hiring manager, not a recruiter. I personally reviewed your resume and wanted to reach out directly. I'd love to chat informally first. Does that work for you?",
        "We're finalizing our candidate list and have a spot for one more strong profile. Your experience fits well. Please reply if you're still actively looking so we can include you.",
    ];

    public function run(): void
    {
        $user = User::where('email', 'rmethodm@outlook.com')->firstOrFail();
        $resumes = Resume::where('user_id', $user->id)->get();

        foreach ($resumes as $i => $resume) {
            $linkCount = ($i % 3) + 1;

            for ($l = 0; $l < $linkCount; $l++) {
                $labelIndex = ($i * 3 + $l) % count($this->linkLabels);
                $isActive = ! ($i === 3 && $l === 0);

                $link = ResumeShareLink::create([
                    'resume_id' => $resume->id,
                    'token' => Str::random(48),
                    'label' => $this->linkLabels[$labelIndex],
                    'is_active' => $isActive,
                ]);

                $messageCount = ($i + $l) % 3 + 1;

                for ($m = 0; $m < $messageCount; $m++) {
                    $senderIndex = ($i * 4 + $l * 3 + $m) % count($this->senders);
                    $messageIndex = ($i * 5 + $l * 7 + $m * 11) % count($this->messages);
                    $isRead = ($m === 0 && $i % 2 === 0);

                    ResumeQuestion::create([
                        'resume_share_link_id' => $link->id,
                        'resume_id' => $resume->id,
                        'sender_name' => $this->senders[$senderIndex]['name'],
                        'sender_email' => $this->senders[$senderIndex]['email'],
                        'sender_phone' => $this->senders[$senderIndex]['phone'],
                        'message' => $this->messages[$messageIndex],
                        'is_read' => $isRead,
                    ]);
                }
            }
        }
    }
}
