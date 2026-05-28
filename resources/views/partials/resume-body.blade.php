@php
    $atsMode = $atsMode ?? false;
    $sep = $atsMode ? ', ' : ' • ';
@endphp

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
<p>{{ implode($sep, $resume->skills) }}</p>
@endif

@if($resume->certifications && count(array_filter($resume->certifications, fn($c2) => !empty($c2['name']))))
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
