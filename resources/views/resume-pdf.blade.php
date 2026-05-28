<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
@php
    $fs = $resume->font_sizes ?? [];
    $sizeName       = $fs['name']           ?? 16;
    $sizeContact    = $fs['contact']        ?? 9.5;
    $sizeHeading    = $fs['heading']        ?? 10.5;
    $sizeBody       = $fs['body']           ?? 10;
    $spacingSection = $fs['sectionSpacing'] ?? 9;
    $spacingEntry   = $fs['entrySpacing']   ?? 3;

    $template = $resume->template ?? 'classic';
    $accent   = $resume->accent_color ?? '#4f46e5';
    $family   = $resume->font_family ?? 'sans';

    $fontFamilyCss = match ($family) {
        'serif' => 'DejaVu Serif, serif',
        'mono'  => 'DejaVu Sans Mono, monospace',
        default => 'DejaVu Sans, sans-serif',
    };

    if ($template === 'executive') {
        $fontFamilyCss = 'DejaVu Serif, serif';
    }
    if ($template === 'ats') {
        $accent = '#000000';
    }

    $c       = $resume->contact ?? [];
    $contactParts = array_filter([
        $c['email'] ?? null, $c['phone'] ?? null,
        $c['location'] ?? null, $c['linkedin'] ?? null, $c['website'] ?? null,
    ]);
@endphp
<style>
  body { font-family: {{ $fontFamilyCss }}; font-size: {{ $sizeBody }}pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 0.75in; }
  h1 { font-size: {{ $sizeName }}pt; margin: 0 0 4px; }
  p { margin: 0; font-size: {{ $sizeBody }}pt; line-height: 1.5; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { font-size: {{ $sizeBody }}pt; margin-bottom: 2px; }
  .row { display: flex; justify-content: space-between; }
  .entry { margin-bottom: {{ $spacingEntry }}pt; }
  .title { font-weight: bold; font-size: {{ $sizeBody }}pt; }
  .sub { font-size: {{ $sizeContact }}pt; color: #555; }
  .date { font-size: {{ $sizeContact }}pt; color: #777; }

  h2 {
    font-size: {{ $sizeHeading }}pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 1px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#ccc' : $accent }};
    padding-bottom: 2px;
    margin: {{ $spacingSection }}pt 0 6px;
    color: {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#444' : $accent }};
  }

  .sb-wrap { display: table; width: 100%; }
  .sb-aside { display: table-cell; width: 35%; background: {{ $accent }}; color: #fff; padding: 0.5in; vertical-align: top; }
  .sb-main  { display: table-cell; width: 65%; padding: 0.5in; vertical-align: top; }
  .sb-aside h1 { color: #fff; text-align: center; }
  .sb-aside .group { margin-top: 14pt; }
  .sb-aside .group-title { font-size: {{ $sizeHeading }}pt; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin-bottom: 4pt; }
  .sb-aside .photo { width: 72pt; height: 72pt; border-radius: 50%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); margin: 0 auto 10pt; }
  .sb-main h2 { color: {{ $accent }}; border-bottom-color: {{ $accent }}; }

  .creative-band { background: {{ $accent }}; color: #fff; padding: 24pt 0.75in; margin: -0.75in -0.75in 18pt; }
  .creative-band h1 { color: #fff; }
  .creative-band .sub { color: rgba(255,255,255,0.85); font-size: {{ $sizeContact }}pt; }

  .exec-header { text-align: center; }
  .exec-header h1 { text-transform: uppercase; letter-spacing: 3px; }
  .exec-header hr { border: 0; border-top: 1px solid #222; margin: 4pt 0; }
  .exec h2 {
    border-top: 3px double #222; border-bottom: 3px double #222;
    text-align: center; padding: 3pt 0;
    letter-spacing: 4px;
    color: #222;
    border-left: 0; border-right: 0;
  }

  .ats h2 { text-transform: none; letter-spacing: 0; border: 0; color: #000; padding: 0; margin: {{ $spacingSection }}pt 0 4pt; font-size: {{ $sizeHeading }}pt; font-weight: bold; }
  .ats .row { display: block; }
  .ats { color: #000; }
</style>
</head>
<body>

@if($template === 'sidebar')
  <div class="sb-wrap">
    <div class="sb-aside">
      <div class="photo"></div>
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="group">
        @foreach($contactParts as $part)
          <div style="font-size: {{ $sizeContact }}pt;">{{ $part }}</div>
        @endforeach
      </div>
      @if($resume->skills && count($resume->skills))
      <div class="group">
        <div class="group-title">Skills</div>
        @foreach($resume->skills as $s)
          <div style="font-size: {{ $sizeBody }}pt;">{{ $s }}</div>
        @endforeach
      </div>
      @endif
    </div>
    <div class="sb-main">
      @include('partials.resume-body')
    </div>
  </div>

@elseif($template === 'creative')
  <div class="page">
    <div class="creative-band">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="sub">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>

@elseif($template === 'executive')
  <div class="page exec">
    <div class="exec-header">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <hr>
      <div style="font-size: {{ $sizeContact }}pt;">{{ implode(' • ', $contactParts) }}</div>
      <hr>
    </div>
    @include('partials.resume-body')
  </div>

@elseif($template === 'ats')
  <div class="page ats">
    <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
    <p style="font-size: {{ $sizeContact }}pt; margin-bottom: 10pt;">{{ implode(' | ', $contactParts) }}</p>
    @include('partials.resume-body', ['atsMode' => true])
  </div>

@else
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#222' : $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>
@endif

</body>
</html>
