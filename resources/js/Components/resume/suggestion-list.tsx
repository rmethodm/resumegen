import { Button } from '@/Components/ui/button';
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
            <p className="rounded-lg border border-gray-200 bg-white p-3 text-[11px] leading-relaxed text-gray-500">
                Nothing to flag. Every bullet leads with an action and carries a
                number.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {suggestions.map((suggestion, index) => (
                <div
                    key={index}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3"
                >
                    <div className="flex flex-wrap items-center gap-1.5">
                        {suggestion.band && (
                            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-text uppercase">
                                {suggestion.band}
                            </span>
                        )}
                        {suggestion.category && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                                {suggestion.category}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-900">
                        {suggestion.message}
                    </p>
                    {suggestion.rewrite ? (
                        <p className="border-l-2 border-accent-500 pl-2 text-[11px] leading-relaxed font-medium text-accent-text">
                            {suggestion.rewrite}
                        </p>
                    ) : (
                        suggestion.verbs.length > 0 && (
                            <p className="text-[11px] leading-relaxed text-gray-500">
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
                </div>
            ))}
        </div>
    );
}
