<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    body {
        font-family: {{ $font === 'serif' ? 'Georgia, "Times New Roman", serif' : 'Helvetica, Arial, sans-serif' }};
        color: #181818;
        font-size: 10.5pt;
        line-height: 1.45;
        margin: 0;
    }
    .page { padding: 0.65in 0.75in; }

    .header { text-align: {{ $view['style']['header']['align'] }}; margin-bottom: 14pt;
        @if ($view['style']['header']['rule']) border-bottom: {{ $view['style']['header']['rule'] }}; padding-bottom: 8pt; @endif
    }
    .header h1 {
        margin: 0 0 3pt;
        font-size: {{ $view['style']['header']['name_size'] }};
        color: {{ $view['style']['header']['name_color'] }};
        @if ($view['style']['header']['name_upper']) text-transform: uppercase; @endif
        @if ($view['style']['header']['name_tracking']) letter-spacing: {{ $view['style']['header']['name_tracking'] }}; @endif
    }
    .header .headline { font-size: 11pt; color: {{ $view['style']['header']['sub_color'] }}; margin-bottom: 2pt; }
    .header .contact { font-size: 9pt; color: {{ $view['style']['header']['sub_color'] }}; }

    h2.section-title {
        font-size: 10.5pt;
        margin: 14pt 0 6pt;
        color: {{ $view['style']['heading']['color'] }};
        letter-spacing: {{ $view['style']['heading']['tracking'] }};
        text-transform: {{ $view['style']['heading']['transform'] }};
        font-weight: {{ $view['style']['heading']['weight'] }};
        @if ($view['style']['heading']['rule']) border-bottom: {{ $view['style']['heading']['rule'] }}; padding-bottom: 3pt; @endif
        @if ($view['style']['heading']['bar']) border-left: 3pt solid {{ $view['style']['heading']['bar'] }}; padding-left: 6pt; @endif
    }

    p.section-text { margin: 0; font-size: 10pt; }

    .entry { margin-bottom: 8pt; }
    .entry table { width: 100%; border-collapse: collapse; }
    .entry td { border: none; padding: 0; vertical-align: top; }
    .entry .primary { font-weight: bold; font-size: 10pt; }
    .entry .secondary { font-size: 9.5pt; color: #555; }
    .entry .dates { font-size: 9pt; color: #777; text-align: right; white-space: nowrap; }
    .entry .description { font-size: 10pt; margin-top: 2pt; }
    .entry ul, .entry ol { margin: 3pt 0 0 14pt; padding: 0; }
    .entry li { font-size: 10pt; margin-bottom: 2pt; }
    .entry .indented-bullets { margin: 3pt 0 0 14pt; }
    .entry .indented-bullets div { font-size: 10pt; margin-bottom: 2pt; }

    table.rows { width: 100%; border-collapse: collapse; }
    table.rows td { border: none; padding: 0 0 4pt; font-size: 10pt; vertical-align: top; }
    table.rows td.right { text-align: right; color: #555; white-space: nowrap; }

    .skills-group { font-size: 10pt; margin-bottom: 3pt; }
    .skills-inline { font-size: 10pt; }
    .skills-bullets { margin: 0 0 0 14pt; padding: 0; }
    .skills-bullets li { font-size: 10pt; margin-bottom: 2pt; }
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
                <div class="entry">
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
                        <td>{{ $row['left'] }}</td>
                        <td class="right">{{ $row['right'] }}</td>
                    </tr>
                @endforeach
            </table>

        @elseif ($section['kind'] === 'skills')
            @if (in_array($section['layout'], ['grouped', 'columns'], true))
                @foreach ($section['groups'] as $group)
                    <div class="skills-group">
                        @if ($group['category'] !== '')<strong>{{ $group['category'] }}:</strong>@endif
                        {{ implode(', ', $group['names']) }}
                    </div>
                @endforeach
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
