<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .muted { color: #71717a; font-size: 14px; }
        .job { border: 1px solid #eeeef5; border-radius: 8px; padding: 16px; margin-top: 12px; }
        .job h3 { margin: 0 0 4px; font-size: 16px; }
        .score { color: #4f46e5; font-weight: 600; font-size: 13px; }
    </style>
</head>
<body>
    <h2>Hi {{ $userName }},</h2>
    <p>New openings matched your saved search <strong>{{ $searchLabel }}</strong>.</p>

    @foreach ($listings as $listing)
        <div class="job">
            <h3>{{ $listing['title'] }}</h3>
            <p class="muted" style="margin: 0;">{{ $listing['company'] ?? 'Unknown company' }} &middot; {{ $listing['location'] ?? '—' }}</p>
            @if ($listing['score'])
                <p class="score" style="margin: 8px 0 0;">{{ $listing['score'] }}% match</p>
                <p class="muted" style="margin: 4px 0 0;">{{ $listing['reason'] }}</p>
            @endif
            @if ($listing['url'])
                <p style="margin: 8px 0 0;"><a href="{{ $listing['url'] }}">View posting →</a></p>
            @endif
        </div>
    @endforeach

    <a href="{{ $jobsUrl }}" class="btn">See all matches →</a>
    <p class="muted" style="margin-top: 32px;">You're receiving this because you turned on daily alerts for this search. <a href="{{ $jobsUrl }}">Manage saved searches</a></p>
</body>
</html>
