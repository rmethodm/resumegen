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
            <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ ltrim($b, "•\-\* \t") }}</li>@endforeach</ul>
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

    @elseif ($sectionKey === 'skills')
        @php
            $skillsLayout = $resume->skills_layout ?? 'inline';
            $hasGroups = in_array($skillsLayout, ['grouped-vertical', 'grouped-inline']) && $resume->skills_groups && count($resume->skills_groups);
            $hasNarratives = $skillsLayout === 'narrative' && $resume->skill_narratives && count($resume->skill_narratives);
            $hasFlat = $resume->skills && count($resume->skills);
        @endphp
        @if ($hasGroups || $hasNarratives || $hasFlat)
        <h2>Skills</h2>
        @if ($hasNarratives)
            @foreach ($resume->skill_narratives as $narrative)
                @if (!empty($narrative['name']))
                <div class="entry">
                    <div class="title" style="font-weight:bold;">{{ $narrative['name'] }}</div>
                    @if (!empty($narrative['bullets']))
                    <ul>@foreach(array_filter($narrative['bullets']) as $b)<li>{{ ltrim($b, "•\-\* \t") }}</li>@endforeach</ul>
                    @endif
                </div>
                @endif
            @endforeach
        @elseif ($hasGroups && $skillsLayout === 'grouped-inline')
            {{-- Category: item1, item2, item3 — each group on its own line, two-column table --}}
            @php $gChunks = array_chunk($resume->skills_groups, (int) ceil(count($resume->skills_groups) / 2)); @endphp
            <table style="width:100%;border:none;border-collapse:collapse;">
                <tr>
                    @foreach ($gChunks as $col)
                    <td style="width:50%;vertical-align:top;padding-right:12pt;">
                        @foreach ($col as $group)
                            @if (!empty($group['items']))
                            <p style="margin:0 0 3pt;"><strong>{{ $group['category'] }}</strong> : {{ implode(', ', $group['items']) }}</p>
                            @endif
                        @endforeach
                    </td>
                    @endforeach
                </tr>
            </table>
        @elseif ($hasGroups && $skillsLayout === 'grouped-vertical')
            {{-- Category bold header, items listed vertically underneath, multi-column --}}
            @php $gChunks = array_chunk($resume->skills_groups, (int) ceil(count($resume->skills_groups) / 3)); @endphp
            <table style="width:100%;border:none;border-collapse:collapse;">
                <tr>
                    @foreach ($gChunks as $col)
                    <td style="vertical-align:top;padding-right:12pt;">
                        @foreach ($col as $group)
                            @if (!empty($group['items']))
                            <p style="margin:0 0 2pt;font-weight:bold;">{{ $group['category'] }}:</p>
                            @foreach ($group['items'] as $item)
                            <p style="margin:0 0 1pt;padding-left:4pt;">{{ $item }}</p>
                            @endforeach
                            @endif
                        @endforeach
                    </td>
                    @endforeach
                </tr>
            </table>
        @elseif ($skillsLayout === 'bullets' && $hasFlat)
            <ul>@foreach($resume->skills as $s)<li>{{ ltrim($s, "•\-\* \t") }}</li>@endforeach</ul>
        @elseif ($hasFlat)
            <p>{{ implode($sep, $resume->skills) }}</p>
        @endif
        @endif

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
                                    @if (!empty($b)) <li>{{ ltrim($b, "•\-\* \t") }}</li> @endif
                                @endforeach
                            </ul>
                        @endif
                    </div>
                @endforeach
            @endif
        @endforeach
    @endif

@endforeach
