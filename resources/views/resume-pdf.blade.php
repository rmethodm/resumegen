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

  .tc-wrap  { display: table; width: 100%; }
  .tc-aside { display: table-cell; width: 30%; background: {{ $accent }}; color: #fff; padding: 0.4in; vertical-align: top; }
  .tc-main  { display: table-cell; width: 70%; padding: 0.4in; vertical-align: top; }
  .tc-aside h1 { color: #fff; font-size: 14pt; text-align: center; margin-bottom: 4pt; }
  .tc-aside .tc-sub { text-align: center; font-size: {{ $sizeContact }}pt; color: rgba(255,255,255,0.85); margin-bottom: 10pt; }
  .tc-aside .tc-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: rgba(255,255,255,0.7); margin: 10pt 0 4pt; }
  .tc-aside .tc-item  { font-size: {{ $sizeBody }}pt; margin-bottom: 2pt; }
  .tc-main h2 { color: {{ $accent }}; border-bottom-color: {{ $accent }}; }

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

  /* bold template */
  .bold h1 { font-size: 22pt; font-weight: 900; letter-spacing: -0.5px; }
  .bold h2 { border-bottom: 3px solid {{ $accent }}; color: {{ $accent }}; font-weight: 900; letter-spacing: 2px; }

  /* academic template */
  .academic h2 { color: #444; border-bottom-color: #ccc; font-weight: bold; }

  /* skills-first chip block */
  .skills-first-chips { background: #eef2ff; border-radius: 4pt; padding: 6pt 8pt; margin-bottom: 8pt; font-size: {{ $sizeBody }}pt; }
  .skills-first-chips .label { font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 4pt; }
</style>
</head>
<body>

@php
    $photoDataUri = null;
    $photoMedia = $resume->getFirstMedia('photo');
    if ($photoMedia && file_exists($photoMedia->getPath())) {
        $photoData = base64_encode(file_get_contents($photoMedia->getPath()));
        $photoMime = $photoMedia->mime_type;
        $photoDataUri = "data:{$photoMime};base64,{$photoData}";
    }
@endphp

@if($template === 'sidebar')
  <div class="sb-wrap">
    <div class="sb-aside">
      @if($photoDataUri)
        <img src="{{ $photoDataUri }}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />
      @endif
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
      @if($photoDataUri)
        <img src="{{ $photoDataUri }}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />
      @endif
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="sub">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>

@elseif($template === 'executive')
  <div class="page exec">
    <div class="exec-header">
      @if($photoDataUri)
        <img src="{{ $photoDataUri }}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />
      @endif
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

@elseif ($template === 'skills-first')
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->skills && count($resume->skills))
      {{-- skills is a plain string[] — render as chips before the body --}}
      <div class="skills-first-chips">
        <div class="label">Core Competencies</div>
        <div>{{ implode(' · ', $resume->skills) }}</div>
      </div>
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
  </div>

@elseif ($template === 'skills-first-visual')
  <div class="page">
    <div style="border-left: 4px solid {{ $accent }}; padding-left: 8pt; margin-bottom: 10pt;">
      <h1 style="text-align:left;">{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: {{ $accent }}; font-weight: bold;">
        {{ $resume->contact['title'] ?? '' }}
      </div>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->skills && count($resume->skills))
      <h2>Technical Skills</h2>
      @foreach ($resume->skills as $skill)
        <div style="display:flex; align-items:center; margin-bottom:3pt; gap:8pt;">
          <span style="font-size:{{ $sizeBody }}pt; width:100pt; flex-shrink:0;">{{ $skill }}</span>
          <div style="height:3pt; flex:1; background:#eeeef5; border-radius:99pt; overflow:hidden;">
            <div style="height:3pt; width:80%; background:{{ $accent }}; border-radius:99pt;"></div>
          </div>
        </div>
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
  </div>

@elseif ($template === 'two-column')
  <div class="tc-wrap">
    <div class="tc-aside">
      @if($photoDataUri)
        <img src="{{ $photoDataUri }}" style="width:65px;height:65px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8pt;" />
      @endif
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div class="tc-sub">
        @foreach($contactParts as $part)
          <div>{{ $part }}</div>
        @endforeach
      </div>
      @if($resume->skills && count($resume->skills))
        <div class="tc-label">Skills</div>
        @foreach($resume->skills as $s)
          <div class="tc-item">{{ $s }}</div>
        @endforeach
      @endif
      @if($resume->certifications && count($resume->certifications))
        <div class="tc-label">Certifications</div>
        @foreach($resume->certifications as $cert)
          <div class="tc-item">{{ $cert['name'] ?? '' }}</div>
        @endforeach
      @endif
    </div>
    <div class="tc-main">
      @include('partials.resume-body', ['skipSections' => ['skills', 'certifications']])
    </div>
  </div>

@elseif ($template === 'timeline')
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->summary)
      <h2>Summary</h2>
      <p>{{ $resume->summary }}</p>
    @endif
    @if ($resume->experience && count($resume->experience))
      <h2>Experience</h2>
      @foreach ($resume->experience as $exp)
        @if (!empty($exp['company']) || !empty($exp['title']))
        <div style="display:flex; gap:8pt; margin-bottom:6pt;">
          <div style="display:flex; flex-direction:column; align-items:center; width:10pt; flex-shrink:0;">
            <div style="width:7pt; height:7pt; border-radius:50%; background:{{ $accent }}; flex-shrink:0;"></div>
            <div style="width:1pt; flex:1; background:#c7d2fe; margin-top:2pt;"></div>
          </div>
          <div style="flex:1; padding-bottom:4pt;">
            <div style="font-weight:bold; font-size:{{ $sizeBody }}pt;">{{ $exp['title'] ?? '' }}</div>
            <div style="font-size:{{ $sizeContact }}pt; color:#71717a;">
              {{ $exp['company'] ?? '' }}
              @if(($exp['start_date'] ?? '') || ($exp['end_date'] ?? ''))
                · {{ $exp['start_date'] ?? '' }} – {{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}
              @endif
            </div>
            @foreach (array_filter(explode("\n", $exp['bullets'] ?? '')) as $b)
              <div style="font-size:{{ $sizeBody }}pt; padding-left:8pt;">• {{ $b }}</div>
            @endforeach
          </div>
        </div>
        @endif
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['summary', 'experience']])
  </div>

@else
  @php
    $outerClass = match($template) {
        'bold'     => 'bold',
        'academic' => 'academic',
        default    => '',
    };
  @endphp
  <div class="page {{ $outerClass }}">
    <div style="text-align:center; border-bottom: 2px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#222' : $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>
@endif

</body>
</html>
