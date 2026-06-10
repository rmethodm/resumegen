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
        $allowed = ['#4f46e5', '#1e3a5f', '#475569', '#166534', '#7f1d1d', '#1f2937', '#0f766e', '#78716c', '#6366f1'];
        $accent = in_array($resume->accent_color, $allowed, true)
            ? $resume->accent_color
            : '#6366f1';

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
  <!-- Background -->
  <rect width="1200" height="630" fill="#ffffff"/>
  <!-- Left accent bar -->
  <rect x="0" y="0" width="10" height="630" fill="{$accent}"/>
  <!-- Subtle bottom rule -->
  <rect x="0" y="620" width="1200" height="10" fill="{$accent}" fill-opacity="0.12"/>

  <!-- Name -->
  <text x="80" y="210" font-family="Georgia, 'Times New Roman', serif" font-size="80" font-weight="700" fill="#0f0f1a">{$name}</text>
  <!-- Title in accent color -->
  <text x="80" y="285" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="{$accent}" font-weight="600">{$title}</text>
  <!-- Divider line -->
  <rect x="80" y="310" width="480" height="2" fill="{$accent}" fill-opacity="0.25"/>
  <!-- Resume label -->
  <text x="80" y="350" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#9ca3af">{$resumeName}</text>
  <!-- Branding -->
  <text x="80" y="590" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="{$accent}" font-weight="600">Resumegen</text>
  <text x="210" y="590" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#c4c4d0">· Build your resume free</text>

  <!-- Right panel: mini resume mockup -->
  <rect x="720" y="60" width="420" height="510" rx="12" fill="{$accent}" fill-opacity="0.04" stroke="{$accent}" stroke-opacity="0.12" stroke-width="1"/>
  <!-- Header block -->
  <rect x="750" y="90" width="200" height="14" rx="3" fill="{$accent}" fill-opacity="0.7"/>
  <rect x="750" y="112" width="140" height="8" rx="2" fill="{$accent}" fill-opacity="0.35"/>
  <!-- Section 1 -->
  <rect x="750" y="142" width="70" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="158" width="340" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="168" width="300" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="178" width="320" height="5" rx="1" fill="#e5e7eb"/>
  <!-- Section 2 -->
  <rect x="750" y="202" width="90" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="218" width="260" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="760" y="228" width="320" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="238" width="290" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="248" width="310" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="750" y="262" width="240" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="760" y="272" width="300" height="5" rx="1" fill="#f3f4f6"/>
  <rect x="760" y="282" width="280" height="5" rx="1" fill="#f3f4f6"/>
  <!-- Section 3 -->
  <rect x="750" y="306" width="80" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="322" width="340" height="5" rx="1" fill="#e5e7eb"/>
  <rect x="750" y="332" width="310" height="5" rx="1" fill="#e5e7eb"/>
  <!-- Section 4 chips row -->
  <rect x="750" y="356" width="60" height="7" rx="2" fill="{$accent}" fill-opacity="0.5"/>
  <rect x="750" y="370" width="62" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="820" y="370" width="72" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="900" y="370" width="55" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
  <rect x="963" y="370" width="80" height="14" rx="7" fill="{$accent}" fill-opacity="0.12"/>
</svg>
SVG;
    }
}
