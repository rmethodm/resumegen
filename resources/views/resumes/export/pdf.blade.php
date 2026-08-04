@php
    $d = $view['density'] ?? [
        'body' => '10.5pt', 'line' => '1.45', 'page_pad_y' => '0.65in', 'page_pad_x' => '0.75in',
        'header_mb' => '14pt', 'section_mt' => '14pt', 'section_mb' => '6pt',
        'entry_mb' => '8pt', 'bullet_mb' => '2pt', 'row_pb' => '4pt',
    ];
    $style = $view['style'] ?? [];
    $header = $style['header'] ?? [];
    $heading = $style['heading'] ?? [];
    $pageAccent = $style['page_accent'] ?? null;
    $entryStyle = $style['entry_style'] ?? 'default';
    $nameWeight = $style['name_weight'] ?? 700;
    $entryAccent = $pageAccent
        ?? ($heading['bar'] ?? null)
        ?? ($heading['color'] ?? '#e5e7eb');
@endphp
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
{!! $fontFaceCss ?? '' !!}
    body {
        font-family: {!! $fontStack !!};
        color: #181818;
        font-size: {{ $d['body'] }};
        line-height: {{ $d['line'] }};
        margin: 0;
    }
    .page {
        padding: {{ $d['page_pad_y'] }} {{ $d['page_pad_x'] }};
        @if ($pageAccent) border-left: 5pt solid {{ $pageAccent }}; @endif
    }

    .header {
        text-align: {{ $header['align'] ?? 'left' }};
        margin-bottom: {{ $d['header_mb'] }};
        @if (! empty($header['rule'])) border-bottom: {{ $header['rule'] }}; padding-bottom: 8pt; @endif
        @if (! empty($header['bg'])) background: {{ $header['bg'] }}; padding: 10pt 12pt; @endif
    }
    .header h1 {
        margin: 0 0 3pt;
        font-size: {{ $header['name_size'] ?? '2em' }};
        color: {{ $header['name_color'] ?? '#181818' }};
        font-weight: {{ $nameWeight }};
        @if (! empty($header['name_upper'])) text-transform: uppercase; @endif
        @if (! empty($header['name_tracking'])) letter-spacing: {{ $header['name_tracking'] }}; @endif
    }
    .header .headline { font-size: 11pt; color: {{ $header['sub_color'] ?? '#555' }}; margin-bottom: 2pt; }
    .header .contact { font-size: 9pt; color: {{ $header['sub_color'] ?? '#555' }}; }

    h2.section-title {
        font-size: {{ $d['body'] }};
        margin: {{ $d['section_mt'] }} 0 {{ $d['section_mb'] }};
        color: {{ $heading['color'] ?? '#181818' }};
        letter-spacing: {{ $heading['tracking'] ?? '0.02em' }};
        text-transform: {{ $heading['transform'] ?? 'none' }};
        font-weight: {{ $heading['weight'] ?? 700 }};
        @if (! empty($heading['rule'])) border-bottom: {{ $heading['rule'] }}; padding-bottom: 3pt; @endif
        @if (! empty($heading['bar'])) border-left: 3pt solid {{ $heading['bar'] }}; padding-left: 6pt; @endif
    }

    p.section-text { margin: 0; font-size: {{ $d['body'] }}; }

    .entry {
        margin-bottom: {{ $d['entry_mb'] }};
    }
    .entry.cards {
        border: 1pt solid {{ $entryAccent }};
        background: #fafafa;
        padding: 6pt 8pt;
        margin-bottom: {{ $d['entry_mb'] }};
    }
    .entry.ruled {
        border-bottom: 1pt solid {{ $entryAccent }};
        padding-bottom: 6pt;
        margin-bottom: {{ $d['entry_mb'] }};
    }
    .entry table { width: 100%; border-collapse: collapse; }
    .entry td { border: none; padding: 0; vertical-align: top; }
    .entry .primary { font-weight: bold; font-size: {{ $d['body'] }}; }
    .entry .secondary { font-size: 9.5pt; color: #555; }
    .entry .dates { font-size: 9pt; color: #777; text-align: right; white-space: nowrap; }
    .entry .dates-stacked { font-size: 9pt; color: #666; margin-top: 1pt; text-align: left; }
    .entry .description { font-size: {{ $d['body'] }}; margin-top: 2pt; }
    .entry ul, .entry ol { margin: 3pt 0 0 14pt; padding: 0; }
    .entry li { font-size: {{ $d['body'] }}; margin-bottom: {{ $d['bullet_mb'] }}; }
    .entry .indented-bullets { margin: 3pt 0 0 14pt; }
    .entry .indented-bullets div { font-size: {{ $d['body'] }}; margin-bottom: {{ $d['bullet_mb'] }}; }

    table.rows { width: 100%; border-collapse: collapse; }
    table.rows tr { page-break-inside: avoid; }
    table.rows td { border: none; padding: 0 0 {{ $d['row_pb'] }}; font-size: {{ $d['body'] }}; vertical-align: top; }
    table.rows td.left { width: 100%; padding-right: 10pt; }
    table.rows td.right { text-align: right; color: #555; white-space: nowrap; width: 1%; }

    .skills-group { font-size: {{ $d['body'] }}; margin-bottom: 3pt; }
    .skills-inline { font-size: {{ $d['body'] }}; }
    .skills-bullets { margin: 0 0 0 14pt; padding: 0; }
    .skills-bullets li { font-size: {{ $d['body'] }}; margin-bottom: {{ $d['bullet_mb'] }}; }
    .skills-columns { width: 100%; border-collapse: collapse; }
    .skills-columns td { border: none; padding: 0 8pt 2pt 0; font-size: {{ $d['body'] }}; vertical-align: top; width: 50%; }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <h1>{{ $view['name'] }}</h1>
        @if ($view['headline'] !== '')
            <div class="headline">{{ $view['headline'] }}</div>
        @endif
        @if ($view['contact'] !== '')
            <div class="contact">{{ $view['contact'] }}</div>
        @endif
    </div>

    @foreach ($view['sections'] as $section)
        <h2 class="section-title">{{ $section['title'] }}</h2>

        @if ($section['kind'] === 'text')
            <p class="section-text">{{ $section['text'] }}</p>

        @elseif ($section['kind'] === 'entries')
            @foreach ($section['entries'] as $entry)
                @php
                    $shell = $section['entry_style'] ?? $entryStyle;
                    $stacked = in_array($shell, ['stacked', 'cards'], true);
                @endphp
                <div class="entry {{ $shell === 'cards' ? 'cards' : ($shell === 'ruled' ? 'ruled' : '') }}">
                    @if ($stacked)
                        <div class="primary">{{ $entry['primary'] }}</div>
                        @if (($entry['secondary'] ?? '') !== '')
                            <div class="secondary">{{ $entry['secondary'] }}</div>
                        @endif
                        @if (($entry['dates'] ?? '') !== '')
                            <div class="dates-stacked">{{ $entry['dates'] }}</div>
                        @endif
                    @else
                        <table>
                            <tr>
                                <td>
                                    <div class="primary">{{ $entry['primary'] }}</div>
                                    @if (($entry['secondary'] ?? '') !== '')
                                        <div class="secondary">{{ $entry['secondary'] }}</div>
                                    @endif
                                </td>
                                @if (($entry['dates'] ?? '') !== '')
                                    <td class="dates">{{ $entry['dates'] }}</td>
                                @endif
                            </tr>
                        </table>
                    @endif
                    @if (($entry['description'] ?? '') !== '')
                        <div class="description">{{ $entry['description'] }}</div>
                    @endif
                    @if (! empty($entry['bullets']))
                        @if (($section['bullet_style'] ?? 'bullet') === 'numbered')
                            <ol>
                                @foreach ($entry['bullets'] as $bullet)
                                    <li>{{ $bullet }}</li>
                                @endforeach
                            </ol>
                        @elseif (($section['bullet_style'] ?? 'bullet') === 'indented')
                            <div class="indented-bullets">
                                @foreach ($entry['bullets'] as $bullet)
                                    <div>{{ $bullet }}</div>
                                @endforeach
                            </div>
                        @else
                            <ul>
                                @foreach ($entry['bullets'] as $bullet)
                                    <li>{{ $bullet }}</li>
                                @endforeach
                            </ul>
                        @endif
                    @endif
                </div>
            @endforeach

        @elseif ($section['kind'] === 'rows')
            <table class="rows">
                @foreach ($section['rows'] as $row)
                    <tr>
                        <td class="left">
                            {{ $row['left'] }}
                            @if (! empty($row['left_sub']))
                                <div style="color: #555; font-size: 9.5pt; margin-top: 1pt;">{{ $row['left_sub'] }}</div>
                            @endif
                        </td>
                        @if (($row['right'] ?? '') !== '')
                            <td class="right">{{ $row['right'] }}</td>
                        @endif
                    </tr>
                @endforeach
            </table>

        @elseif ($section['kind'] === 'skills')
            @if (in_array($section['layout'], ['grouped'], true))
                @foreach ($section['groups'] as $group)
                    <div class="skills-group">
                        @if ($group['category'] !== '')<strong>{{ $group['category'] }}:</strong>@endif
                        {{ implode(', ', $group['names']) }}
                    </div>
                @endforeach
            @elseif ($section['layout'] === 'columns')
                @php
                    $names = $section['names'] ?? [];
                    $mid = (int) ceil(count($names) / 2);
                    $left = array_slice($names, 0, $mid);
                    $right = array_slice($names, $mid);
                    $rows = max(count($left), count($right));
                @endphp
                <table class="skills-columns">
                    @for ($i = 0; $i < $rows; $i++)
                        <tr>
                            <td>{{ $left[$i] ?? '' }}</td>
                            <td>{{ $right[$i] ?? '' }}</td>
                        </tr>
                    @endfor
                </table>
            @elseif ($section['layout'] === 'bullets')
                <ul class="skills-bullets">
                    @foreach ($section['names'] as $name)
                        <li>{{ $name }}</li>
                    @endforeach
                </ul>
            @else
                <div class="skills-inline">{{ implode(' • ', $section['names']) }}</div>
            @endif
        @endif
    @endforeach
</div>
</body>
</html>
