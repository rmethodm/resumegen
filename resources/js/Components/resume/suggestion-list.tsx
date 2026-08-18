import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import type { ResumeSuggestion } from '@/types';

/** The deterministic ResumeAnalysis output, shown in the workstation left rail. */
export function SuggestionList({
    suggestions,
    onApply,
    onSelect,
}: {
    suggestions: ResumeSuggestion[];
    onApply: (suggestion: ResumeSuggestion) => void;
    onSelect: (suggestion: ResumeSuggestion) => void;
}) {
    if (suggestions.length === 0) {
        return (
            <p className="rounded-lg border border-surface-border bg-white p-3 text-xs leading-relaxed text-ink-muted">
                Nothing to flag. Every bullet leads with an action and carries a
                number.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {suggestions.map((suggestion, index) => (
                <Card
                    key={index}
                    className="gap-2 p-3"
                >
                    <div className="flex flex-wrap items-center gap-1.5">
                        {suggestion.band && (
                            <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-semibold tracking-wide text-brand uppercase">
                                {suggestion.band}
                            </span>
                        )}
                        {suggestion.category && (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                                {suggestion.category}
                            </span>
                        )}
                    </div>
                    <p className="text-xs leading-relaxed text-ink">
                        {suggestion.message}
                    </p>
                    {suggestion.rewrite ? (
                        <p className="border-l-2 border-brand pl-2 text-xs leading-relaxed font-medium text-brand">
                            {suggestion.rewrite}
                        </p>
                    ) : (
                        suggestion.verbs.length > 0 && (
                            <p className="text-xs leading-relaxed text-ink-muted">
                                Consider: {suggestion.verbs.join(', ')}
                            </p>
                        )
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onSelect(suggestion)}
                            className="self-start"
                        >
                            Jump
                        </Button>
                        {suggestion.rewrite && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onApply(suggestion)}
                                className={cn('self-start')}
                            >
                                Apply
                            </Button>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    );
}
