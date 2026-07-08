<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .btn-secondary { display: inline-block; background: transparent; color: #4f46e5; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; margin-left: 8px; border: 1px solid #4f46e5; }
        .muted { color: #71717a; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Hi {{ $userName }},</h2>
    <p>Your resume got <strong>{{ $viewCount }}</strong> {{ Str::plural('view', $viewCount) }} this week.</p>
    @if ($topSection)
        <p>Recruiters spent the most time on your <strong>{{ $topSection }}</strong> section.</p>
    @endif
    <a href="{{ $dashboardUrl }}" class="btn">View Details →</a>
    <a href="{{ $billingUrl }}" class="btn-secondary">Upgrade to Starter</a>
    <p class="muted" style="margin-top: 32px;">Starter shows you who's viewing and removes the watermark.</p>
    <p class="muted">You're receiving this because you have a Resumegen account. <a href="{{ route('profile.edit') }}">Manage preferences</a></p>
</body>
</html>
