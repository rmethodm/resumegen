<?php

namespace App\Http\Controllers;

use App\Models\ResumeShareLink;
use Illuminate\Http\Response;

class OgImageController extends Controller
{
    public function show(string $token): Response
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        $resume = $link->resume;
        $contact = $resume->contact ?? [];
        $name = $contact['full_name'] ?? $resume->name;
        $title = $contact['title'] ?? '';
        $accent = $resume->accent_color ?? '#6366f1';

        $svg = $this->buildSvg($name, $title, $accent, $resume->name);

        return response($svg, 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function buildSvg(string $name, string $title, string $accent, string $resumeName): string
    {
        $name = htmlspecialchars($name, ENT_XML1);
        $title = htmlspecialchars($title, ENT_XML1);
        $resumeName = htmlspecialchars($resumeName, ENT_XML1);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{$accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="630" fill="{$accent}"/>
  <text x="80" y="220" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#111827">{$name}</text>
  <text x="80" y="300" font-family="Georgia, serif" font-size="40" fill="#6b7280">{$title}</text>
  <text x="80" y="400" font-family="Arial, sans-serif" font-size="28" fill="#9ca3af">{$resumeName}</text>
  <text x="1120" y="600" font-family="Arial, sans-serif" font-size="22" fill="{$accent}" text-anchor="end">Resumegen</text>
</svg>
SVG;
    }
}
