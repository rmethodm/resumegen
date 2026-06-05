@php
    $atsMode = $atsMode ?? false;
    $sep = $atsMode ? ', ' : ' • ';
    $skipSections = $skipSections ?? [];

    $defaultOrder = ['summary', 'experience', 'education', 'skills', 'certifications'];
    $sectionOrder = $resume->section_order ?? $defaultOrder;
    // Ensure no built-in sections are dropped if section_order was saved before a section existed
    $builtinInOrder = array_intersect($defaultOrder, $sectionOrder);
    $missing = array_diff($defaultOrder, $builtinInOrder);
    $sectionOrder = array_merge($sectionOrder, $missing);
@endphp

@foreach ($sectionOrder as $sectionKey)
    @if (in_array($sectionKey, $skipSections)) @continue @endif

    @if ($sectionKey === 'summary' && $resume->summary)
        <h2>Summary</h2>
        <p>{{ $resume->summary }}</p>

    @elseif ($sectionKey === 'experience' && $resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
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

    @elseif ($sectionKey === 'education' && $resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
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

    @elseif ($sectionKey === 'skills' && $resume->skills && count($resume->skills))
        <h2>Skills</h2>
        {{-- skills is a plain string[] --}}
        <p>{{ implode($sep, $resume->skills) }}</p>

    @elseif ($sectionKey === 'certifications' && $resume->certifications && count(array_filter($resume->certifications, fn($c2) => !empty($c2['name']))))
        <h2>Certifications</h2>
        @foreach($resume->certifications as $cert)
          @if(!empty($cert['name']))
          <div class="entry row">
            <span class="title">{{ $cert['name'] }}</span>
            <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
          </div>
          @endif
        @endforeach

    @elseif (str_starts_with($sectionKey, 'custom_'))
        @php $customId = substr($sectionKey, 7); @endphp
        @foreach (($resume->custom_sections ?? []) as $cs)
            @if ($cs['id'] === $customId)
                <h2>{{ $cs['name'] }}</h2>
                @foreach ($cs['entries'] ?? [] as $entry)
                    <div class="entry">
                        <div class="row">
                            <span class="title">{{ $entry['title'] ?? '' }}</span>
                            <span class="date">
                                {{ $entry['start_date'] ?? '' }}
                                @if (!empty($entry['end_date'])) – {{ $entry['end_date'] }} @endif
                            </span>
                        </div>
                        @if (!empty($entry['subtitle']))
                            <div class="sub">{{ $entry['subtitle'] }}</div>
                        @endif
                        @if (!empty($entry['description']))
                            <p>{{ $entry['description'] }}</p>
                        @endif
                        @if (!empty($entry['bullets']))
                            <ul>
                                @foreach ($entry['bullets'] as $b)
                                    @if (!empty($b)) <li>{{ $b }}</li> @endif
                                @endforeach
                            </ul>
                        @endif
                    </div>
                @endforeach
            @endif
        @endforeach
    @endif

@endforeach
