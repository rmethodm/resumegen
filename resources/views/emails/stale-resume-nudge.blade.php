<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .muted { color: #71717a; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Hi {{ $userName }},</h2>
    <p>Your resume <strong>{{ $resumeName }}</strong> hasn't been updated in {{ $daysSinceEdit }} days.</p>
    <p>Recruiters often filter for recent activity — a quick refresh keeps you competitive.</p>
    <a href="{{ $editUrl }}" class="btn">Update Resume →</a>
    <p class="muted" style="margin-top: 32px;">You're receiving this because you have a Resumegen account. <a href="{{ route('profile.edit') }}">Manage preferences</a></p>
</body>
</html>
