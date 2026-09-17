<?php

return [
    'starter_credits' => (int) env('AI_STARTER_CREDITS', 20),

    'fake_mode' => (bool) env('AI_FAKE_MODE', false),

    'costs' => [
        'qa_bank_draft' => 1,
        'resume_review' => 3,
    ],
];
