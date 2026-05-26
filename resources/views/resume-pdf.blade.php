<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 0.75in; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .contact-line { font-size: 9pt; color: #555; margin-bottom: 16px; }
  h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 12px 0 6px; color: #444; }
  .entry { margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; }
  .title { font-weight: bold; font-size: 11pt; }
  .sub { font-size: 9.5pt; color: #555; }
  .date { font-size: 9pt; color: #777; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { font-size: 10pt; margin-bottom: 2px; }
  p { margin: 0; font-size: 10.5pt; line-height: 1.5; }
</style>
</head>
<body>
<div class="page">
  <div style="text-align:center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 12px;">
    <h1>{{ $resume->contact['full_name'] ?? $resume->name }}</h1>
    <div class="contact-line">
      @php $c = $resume->contact ?? []; @endphp
      {{ implode(' • ', array_filter([$c['email'] ?? null, $c['phone'] ?? null, $c['location'] ?? null, $c['linkedin'] ?? null, $c['website'] ?? null])) }}
    </div>
  </div>

  @if($resume->summary)
  <h2>Summary</h2>
  <p>{{ $resume->summary }}</p>
  @endif

  @if($resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
  <h2>Work Experience</h2>
  @foreach($resume->experience as $exp)
    @if(!empty($exp['company']) || !empty($exp['title']))
    <div class="entry">
      <div class="row">
        <span class="title">{{ $exp['title'] ?? '' }}</span>
        <span class="date">{{ $exp['start_date'] ?? '' }}{{ ($exp['start_date'] ?? '') || ($exp['end_date'] ?? '') ? ' – ' : '' }}{{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}</span>
      </div>
      <div class="sub">{{ $exp['company'] ?? '' }}</div>
      @if(!empty($exp['bullets']))
      <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ $b }}</li>@endforeach</ul>
      @endif
    </div>
    @endif
  @endforeach
  @endif

  @if($resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
  <h2>Education</h2>
  @foreach($resume->education as $edu)
    @if(!empty($edu['school']))
    <div class="entry row">
      <div>
        <span class="title">{{ $edu['school'] }}</span>
        <span class="sub" style="margin-left:8px;">{{ implode(' in ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null])) }}</span>
      </div>
      <span class="date">{{ $edu['grad_year'] ?? '' }}</span>
    </div>
    @endif
  @endforeach
  @endif

  @if($resume->skills && count($resume->skills))
  <h2>Skills</h2>
  <p>{{ implode(' • ', $resume->skills) }}</p>
  @endif

  @if($resume->certifications && count(array_filter($resume->certifications, fn($c) => !empty($c['name']))))
  <h2>Certifications</h2>
  @foreach($resume->certifications as $cert)
    @if(!empty($cert['name']))
    <div class="entry row">
      <span class="title">{{ $cert['name'] }}</span>
      <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
    </div>
    @endif
  @endforeach
  @endif
</div>
</body>
</html>
